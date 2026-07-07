import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import {
  CreateProductDto,
  UpdateProductDto,
  FilterProductsDto,
  ReorderImagesDto,
  CreateDiscountDto,
} from "./dto/product.dto";
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

  @Get("admin/all")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "List all products including inactive (admin)",
  })
  findAllAdmin(@Query() filter: FilterProductsDto) {
    return this.productsService.findAll(filter, true);
  }

  @Get("admin/:id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Get a single product by id including inactive (admin)",
  })
  findOneAdmin(@Param("id") id: string) {
    return this.productsService.findByIdAdmin(id);
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
    console.log(images);
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
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    console.log(images);

    return this.productsService.update(id, dto, images);
  }

  @Patch(":id/images/reorder")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Reorder product images (admin)" })
  reorderImages(@Param("id") id: string, @Body() dto: ReorderImagesDto) {
    return this.productsService.reorderImages(id, dto.imageIds);
  }

  @Delete(":id/images/:imageId")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Delete a single product image (admin)" })
  deleteImage(@Param("id") id: string, @Param("imageId") imageId: string) {
    return this.productsService.deleteImage(id, imageId);
  }

  @Post(":id/discounts")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Add a discount to a product (admin)" })
  addDiscount(@Param("id") id: string, @Body() dto: CreateDiscountDto) {
    return this.productsService.addDiscount(id, dto);
  }

  @Delete(":id/discounts/:discountId")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Remove a discount from a product (admin)" })
  removeDiscount(
    @Param("id") id: string,
    @Param("discountId") discountId: string,
  ) {
    return this.productsService.removeDiscount(id, discountId);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Delete product (admin)" })
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
