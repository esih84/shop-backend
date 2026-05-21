import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, Product])],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
