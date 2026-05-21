import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { Discount } from './entities/discount.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductImage, ProductAttribute, Discount])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
