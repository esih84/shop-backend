import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponType } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { CreateCouponDto, ValidateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly usageRepository: Repository<CouponUsage>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    return this.couponRepository.save(this.couponRepository.create(dto));
  }

  async findAll(page = 1, limit = 20) {
    const [coupons, total] = await this.couponRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return { coupons, total, page, limit };
  }

  async validate(userId: string, dto: ValidateCouponDto): Promise<{ discount: number; coupon: Coupon }> {
    const coupon = await this.couponRepository.findOne({
      where: { code: dto.code, isActive: true },
    });

    if (!coupon) throw new NotFoundException('Coupon not found or inactive');

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) throw new BadRequestException('Coupon not yet active');
    if (coupon.endDate && coupon.endDate < now) throw new BadRequestException('Coupon has expired');
    if (dto.cartTotal < Number(coupon.minPurchase)) {
      throw new BadRequestException(`Minimum purchase of ${coupon.minPurchase} required`);
    }

    const totalUsage = await this.usageRepository.count({ where: { couponId: coupon.id } });
    if (coupon.usageLimit && totalUsage >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const userUsage = await this.usageRepository.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsage >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (dto.cartTotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else if (coupon.type === CouponType.FIXED) {
      discount = Math.min(Number(coupon.value), dto.cartTotal);
    }

    return { discount, coupon };
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<Coupon> {
    await this.couponRepository.update(id, dto);
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async remove(id: string): Promise<void> {
    await this.couponRepository.delete(id);
  }
}
