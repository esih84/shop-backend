import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, FilterProductsDto } from './dto/product.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List products with filtering and pagination' })
  findAll(@Query() filter: FilterProductsDto) {
    return this.productsService.findAll(filter);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get product details by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/variants')
  @Public()
  @ApiOperation({ summary: 'Get product variants' })
  getVariants(@Param('id') id: string) {
    return this.productsService.getVariants(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create product (admin)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update product (admin)' })
  update(@Param('id') id: string, @Body() dto: CreateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete product (admin)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
