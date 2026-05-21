import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbandonedCart } from './entities/abandoned-cart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AbandonedCart])],
})
export class CampaignsModule {}
