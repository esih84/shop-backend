import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Pet } from '../pets/entities/pet.entity';
import { paginated } from '../../common/dto/paginated-result';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import {
  computeSegment,
  quintileScores,
  daysSince,
  DEFAULT_THRESHOLDS,
  SEGMENTS,
} from './rfm';

export interface RecipientUser {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  petName?: string;
}

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
  ) {}

  /**
   * ثبت یک خرید موفق روی پروفایل کاربر (Recency/Frequency/Monetary خام).
   * از payment.verify پس از موفقیت پرداخت صدا زده می‌شود. سگمنت قاعده‌محور هم
   * بلافاصله به‌روز می‌شود.
   */
  async recordPurchase(
    userId: string,
    amount: number,
    when: Date = new Date(),
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    user.orderCount = (user.orderCount ?? 0) + 1;
    user.totalSpent = Number(user.totalSpent ?? 0) + Number(amount);
    user.lastOrderAmount = Number(amount);
    user.lastPurchaseAt = when;
    if (!user.firstPurchaseAt) user.firstPurchaseAt = when;
    user.rfmSegment = computeSegment(
      {
        orderCount: user.orderCount,
        totalSpent: user.totalSpent,
        lastPurchaseAt: user.lastPurchaseAt,
      },
      when,
    );
    await this.userRepo.save(user);
  }

  /** سازنده‌ی کوئری مشتریان بر اساس فیلتر RFM (مشترک لیست و کمپین). */
  private buildQuery(filter: CustomerFilterDto): SelectQueryBuilder<User> {
    const qb = this.userRepo.createQueryBuilder('u');

    if (filter.segment) qb.andWhere('u.rfmSegment = :seg', { seg: filter.segment });
    if (filter.minSpent !== undefined)
      qb.andWhere('u.totalSpent >= :minSpent', { minSpent: filter.minSpent });
    if (filter.maxSpent !== undefined)
      qb.andWhere('u.totalSpent <= :maxSpent', { maxSpent: filter.maxSpent });
    if (filter.minOrders !== undefined)
      qb.andWhere('u.orderCount >= :minOrders', { minOrders: filter.minOrders });
    if (filter.lastPurchaseWithinDays !== undefined)
      qb.andWhere(
        "u.lastPurchaseAt >= NOW() - (:wd || ' days')::interval",
        { wd: filter.lastPurchaseWithinDays },
      );
    if (filter.lastPurchaseOlderThanDays !== undefined)
      qb.andWhere(
        "(u.lastPurchaseAt IS NULL OR u.lastPurchaseAt < NOW() - (:od || ' days')::interval)",
        { od: filter.lastPurchaseOlderThanDays },
      );
    if (filter.petType)
      qb.andWhere(
        'EXISTS (SELECT 1 FROM pets p WHERE p.user_id = u.id AND p.type = :pt)',
        { pt: filter.petType },
      );
    if (filter.search)
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.phone ILIKE :s)',
        { s: `%${filter.search}%` },
      );
    return qb;
  }

  /** لیست مشتریان با فیلدهای RFM (صفحه‌بندی‌شده) برای داشبورد. */
  async getCustomers(filter: CustomerFilterDto) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const qb = this.buildQuery(filter)
      .orderBy('u.lastPurchaseAt', 'DESC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, page, limit);
  }

  /** تعداد مشتری در هر سگمنت (برای نمای کلی داشبورد). */
  async getSegmentCounts(): Promise<Record<string, number>> {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.rfmSegment', 'segment')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.rfmSegment')
      .getRawMany<{ segment: string | null; count: string }>();
    const result: Record<string, number> = {};
    for (const seg of SEGMENTS) result[seg] = 0;
    for (const r of rows) {
      const key = r.segment ?? 'prospect';
      result[key] = (result[key] ?? 0) + Number(r.count);
    }
    return result;
  }

  /** گیرنده‌های کمپین (کاربران فعال، بدون opt-out، با نام پت برای شخصی‌سازی). */
  async resolveRecipients(filter: CustomerFilterDto): Promise<RecipientUser[]> {
    const qb = this.buildQuery(filter)
      .andWhere('u.isActive = true')
      .andWhere('u.smsOptOut = false')
      .andWhere("u.phone IS NOT NULL AND u.phone <> ''");
    const users = await qb.getMany();
    if (!users.length) return [];

    // اولین پت هر کاربر برای جایگزینی {pet}
    const ids = users.map((u) => u.id);
    const pets = await this.petRepo
      .createQueryBuilder('p')
      .where('p.userId IN (:...ids)', { ids })
      .orderBy('p.createdAt', 'ASC')
      .getMany();
    const petByUser = new Map<string, string>();
    for (const p of pets) if (!petByUser.has(p.userId)) petByUser.set(p.userId, p.name);

    return users.map((u) => ({
      id: u.id,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      petName: petByUser.get(u.id),
    }));
  }

  /**
   * بازمحاسبه‌ی گروهی امتیازهای کوانتایلی RFM و برچسب سگمنت برای همه‌ی کاربران.
   * چون Recency با گذشت زمان تغییر می‌کند، این متد به‌صورت دستی (یا با cron روزانه)
   * صدا زده می‌شود.
   */
  async recomputeAll(): Promise<{ updated: number }> {
    const now = new Date();
    const buyers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.orderCount > 0')
      .getMany();

    if (buyers.length) {
      const recencyDays = buyers.map((u) => daysSince(u.lastPurchaseAt, now) ?? 99999);
      // Recency: روزهای کمتر بهتر → مقدار منفی برای امتیاز کوانتایلی
      const rScores = quintileScores(recencyDays.map((d) => -d));
      const fScores = quintileScores(buyers.map((u) => u.orderCount ?? 0));
      const mScores = quintileScores(buyers.map((u) => Number(u.totalSpent ?? 0)));

      buyers.forEach((u, i) => {
        u.rfmR = rScores[i];
        u.rfmF = fScores[i];
        u.rfmM = mScores[i];
        u.rfmSegment = computeSegment(
          {
            orderCount: u.orderCount ?? 0,
            totalSpent: Number(u.totalSpent ?? 0),
            lastPurchaseAt: u.lastPurchaseAt,
          },
          now,
          DEFAULT_THRESHOLDS,
        );
      });
      await this.userRepo.save(buyers);
    }

    // کاربران بدون خرید → prospect
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        rfmSegment: 'prospect',
        rfmR: () => 'NULL',
        rfmF: () => 'NULL',
        rfmM: () => 'NULL',
      })
      .where('orderCount = 0 OR orderCount IS NULL')
      .execute();

    return { updated: buyers.length };
  }
}
