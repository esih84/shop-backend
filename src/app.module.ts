import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { BullModule } from "@nestjs/bullmq";
import { createKeyv } from "@keyv/redis";

import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import redisConfig from "./config/redis.config";
import jwtConfig from "./config/jwt.config";
import awsConfig from "./config/aws.config";

// Entities
import { User } from "./modules/users/entities/user.entity";
import { Otp } from "./modules/auth/entities/otp.entity";
import { Category } from "./modules/categories/entities/category.entity";
import { Product } from "./modules/products/entities/product.entity";
import { ProductVariant } from "./modules/products/entities/product-variant.entity";
import { ProductImage } from "./modules/products/entities/product-image.entity";
import { ProductAttribute } from "./modules/products/entities/product-attribute.entity";
import { Discount } from "./modules/products/entities/discount.entity";
import { Review } from "./modules/reviews/entities/review.entity";
import { Cart } from "./modules/cart/entities/cart.entity";
import { CartItem } from "./modules/cart/entities/cart-item.entity";
import { Order } from "./modules/orders/entities/order.entity";
import { OrderItem } from "./modules/orders/entities/order-item.entity";
import { Blog } from "./modules/blogs/entities/blog.entity";
import { Banner } from "./modules/banners/entities/banner.entity";
import { Collection } from "./modules/collections/entities/collection.entity";
import { LoyaltyTier } from "./modules/loyalty/entities/loyalty-tier.entity";
import { UserLoyalty } from "./modules/loyalty/entities/user-loyalty.entity";
import { PointTransaction } from "./modules/loyalty/entities/point-transaction.entity";
import { Coupon } from "./modules/coupons/entities/coupon.entity";
import { CouponUsage } from "./modules/coupons/entities/coupon-usage.entity";
import { Wishlist } from "./modules/wishlist/entities/wishlist.entity";
import { Referral } from "./modules/referrals/entities/referral.entity";
import { AbandonedCart } from "./modules/campaigns/entities/abandoned-cart.entity";
import { ProductView } from "./modules/analytics/entities/product-view.entity";

// Modules
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ProductsModule } from "./modules/products/products.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { CartModule } from "./modules/cart/cart.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { BlogsModule } from "./modules/blogs/blogs.module";
import { BannersModule } from "./modules/banners/banners.module";
import { CollectionsModule } from "./modules/collections/collections.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { ReferralsModule } from "./modules/referrals/referrals.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { UploadModule } from "./modules/upload/upload.module";

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, awsConfig],
      envFilePath: [".env.local", ".env"],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get("database.host"),
        port: config.get<number>("database.port"),
        username: config.get("database.username"),
        password: config.get("database.password"),
        database: config.get("database.name"),
        poolSize: config.get<number>("database.poolSize"),
        entities: [
          User,
          Otp,
          Category,
          Product,
          ProductVariant,
          ProductImage,
          ProductAttribute,
          Discount,
          Review,
          Cart,
          CartItem,
          Order,
          OrderItem,
          Blog,
          Banner,
          Collection,
          LoyaltyTier,
          UserLoyalty,
          PointTransaction,
          Coupon,
          CouponUsage,
          Wishlist,
          Referral,
          AbandonedCart,
          ProductView,
        ],
        synchronize: config.get("app.nodeEnv") !== "production",
        logging: config.get("app.nodeEnv") === "development",
        ssl:
          config.get("app.nodeEnv") === "production"
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // Cache (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          createKeyv(
            `redis://${config.get("redis.password") ? `:${config.get("redis.password")}@` : ""}${config.get("redis.host")}:${config.get("redis.port")}/${config.get("redis.db")}`,
          ),
        ],
        ttl: 3600000,
      }),
    }),

    // Bull Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("redis.host"),
          port: config.get<number>("redis.port"),
          password: config.get("redis.password") || undefined,
          db: config.get<number>("redis.db"),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        },
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>("app.throttleTtl", 60) * 1000,
            limit: config.get<number>("app.throttleLimit", 100),
          },
        ],
      }),
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    ReviewsModule,
    CartModule,
    OrdersModule,
    BlogsModule,
    BannersModule,
    CollectionsModule,
    LoyaltyModule,
    CouponsModule,
    WishlistModule,
    ReferralsModule,
    AnalyticsModule,
    UploadModule,
  ],
})
export class AppModule {}
