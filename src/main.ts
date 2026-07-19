import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port", 3000);
  const nodeEnv = configService.get<string>("app.nodeEnv", "development");

  // Security
  app.use(helmet());
  // در production فهرست origin‌های مجاز (فروشگاه + داشبورد) از CORS_ORIGINS خوانده می‌شود.
  const corsOrigins = (configService.get<string>("app.corsOrigins") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: nodeEnv === "production" ? corsOrigins : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
  });

  // Compression
  app.use(compression());

  // Cookie parsing (httpOnly auth cookies)
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix("api");

  // Versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger (non-production only)
  if (nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle("E-Commerce API")
      .setDescription("High-performance e-commerce backend API documentation")
      .setVersion("1.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "access-token",
      )
      .addTag("auth", "Authentication endpoints")
      .addTag("users", "User management")
      .addTag("categories", "Product categories")
      .addTag("products", "Product management")
      .addTag("reviews", "Product reviews")
      .addTag("cart", "Shopping cart")
      .addTag("orders", "Order management")
      .addTag("loyalty", "Loyalty program")
      .addTag("coupons", "Coupon management")
      .addTag("wishlist", "Wishlist management")
      .addTag("blogs", "Blog content")
      .addTag("banners", "Banner management")
      .addTag("collections", "Product collections")
      .addTag("analytics", "Analytics & reports")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}/api/v1`);
  if (nodeEnv !== "production") {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
