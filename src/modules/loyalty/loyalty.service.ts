import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { UserLoyalty } from './entities/user-loyalty.entity';
import { PointTransaction, PointTransactionType } from './entities/point-transaction.entity';
import { CreateLoyaltyTierDto } from './dto/loyalty.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTier)
    private readonly tierRepository: Repository<LoyaltyTier>,
    @InjectRepository(UserLoyalty)
    private readonly userLoyaltyRepository: Repository<UserLoyalty>,
    @InjectRepository(PointTransaction)
    private readonly pointTxRepository: Repository<PointTransaction>,
  ) {}

  // Tiers
  async createTier(dto: CreateLoyaltyTierDto): Promise<LoyaltyTier> {
    return this.tierRepository.save(this.tierRepository.create(dto));
  }

  async findAllTiers(): Promise<LoyaltyTier[]> {
    return this.tierRepository.find({ order: { minPoints: 'ASC' } });
  }

  async updateTier(id: string, dto: Partial<CreateLoyaltyTierDto>): Promise<LoyaltyTier> {
    await this.tierRepository.update(id, dto);
    const tier = await this.tierRepository.findOne({ where: { id } });
    if (!tier) throw new NotFoundException('Tier not found');
    return tier;
  }

  // User loyalty
  async getUserLoyalty(userId: string): Promise<UserLoyalty> {
    let loyalty = await this.userLoyaltyRepository.findOne({
      where: { userId },
      relations: ['tier'],
    });
    if (!loyalty) {
      loyalty = await this.userLoyaltyRepository.save(
        this.userLoyaltyRepository.create({ userId }),
      );
    }
    return loyalty;
  }

  async earnPoints(userId: string, points: number, reason: string, referenceType?: string, referenceId?: string): Promise<void> {
    let loyalty = await this.userLoyaltyRepository.findOne({ where: { userId } });
    if (!loyalty) {
      loyalty = await this.userLoyaltyRepository.save(
        this.userLoyaltyRepository.create({ userId }),
      );
    }

    await this.userLoyaltyRepository.update(loyalty.id, {
      totalPoints: loyalty.totalPoints + points,
      availablePoints: loyalty.availablePoints + points,
    });

    await this.pointTxRepository.save(
      this.pointTxRepository.create({
        userId,
        points,
        type: PointTransactionType.EARN,
        reason,
        referenceType,
        referenceId,
      }),
    );

    await this.checkAndUpgradeTier(userId);
  }

  private async checkAndUpgradeTier(userId: string): Promise<void> {
    const loyalty = await this.userLoyaltyRepository.findOne({ where: { userId } });
    if (!loyalty) return;

    const tiers = await this.tierRepository.find({ order: { minPoints: 'DESC' } });
    const eligibleTier = tiers.find(
      (t) => loyalty.totalPoints >= t.minPoints && Number(loyalty.totalSpent) >= Number(t.minSpent),
    );

    if (eligibleTier && loyalty.tierId !== eligibleTier.id) {
      await this.userLoyaltyRepository.update(loyalty.id, { tierId: eligibleTier.id });
    }
  }

  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const [transactions, total] = await this.pointTxRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { transactions, total, page, limit };
  }
}
