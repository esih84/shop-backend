import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Referral, User])],
  controllers: [ReferralsController],
  providers: [ReferralsService],
})
export class ReferralsModule {}
