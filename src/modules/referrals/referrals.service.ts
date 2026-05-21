import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getReferrals(userId: string) {
    return this.referralRepository.find({
      where: { referrerId: userId },
      relations: ['referred'],
      order: { createdAt: 'DESC' },
    });
  }

  async trackReferral(referralCode: string, newUserId: string): Promise<void> {
    const referrer = await this.userRepository.findOne({ where: { referralCode } });
    if (!referrer) return;

    const existing = await this.referralRepository.findOne({
      where: { referredId: newUserId },
    });
    if (existing) return;

    await this.referralRepository.save(
      this.referralRepository.create({
        referrerId: referrer.id,
        referredId: newUserId,
        code: referralCode,
        status: ReferralStatus.PENDING,
      }),
    );
  }

  async completeReferral(referredUserId: string): Promise<void> {
    const referral = await this.referralRepository.findOne({
      where: { referredId: referredUserId, status: ReferralStatus.PENDING },
    });
    if (!referral) return;

    await this.referralRepository.update(referral.id, {
      status: ReferralStatus.COMPLETED,
    });
  }
}
