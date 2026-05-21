import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { UserLoyalty } from './entities/user-loyalty.entity';
import { PointTransaction } from './entities/point-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyTier, UserLoyalty, PointTransaction])],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
