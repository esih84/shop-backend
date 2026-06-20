import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto, FilterProductsDto } from "./dto/product.dto";
import { Roles, Role } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

const productImages = FilesInterceptor("images", 10, {
  storage: memoryStorage(),
});

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List products with filtering and pagination" })
  findAll(@Query() filter: FilterProductsDto) {
    return this.productsService.findAll(filter);
  }

  @Get(":slug")
  @Public()
  @ApiOperation({ summary: "Get product details by slug" })
  findBySlug(@Param("slug") slug: string) {
    return this.productsService.findBySlug(slug);
  }


  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiOperation({ summary: "Create product (admin) — با آپلود تصاویر" })
  @UseInterceptors(productImages)
  create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.productsService.create(dto, images);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiOperation({ summary: "Update product (admin) — با آپلود تصاویر" })
  @UseInterceptors(productImages)
  update(
    @Param("id") id: string,
    @Body() dto: CreateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.productsService.update(id, dto, images);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Delete product (admin)" })
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
