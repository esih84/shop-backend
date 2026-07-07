import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponScope } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateCouponDto } from './dto/coupon.dto';
import { calcCouponDiscount, eligibleSubtotal, CouponLine } from './coupon-calc';
import { paginated } from '../../common/dto/paginated-result';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly usageRepository: Repository<CouponUsage>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
  ) {}

  /** رابطه‌های products/categories را از idها روی نمونه‌ی کوپن ست می‌کند. */
  private applyRelations(coupon: Coupon, dto: Partial<CreateCouponDto>): void {
    if (dto.productIds) {
      coupon.products = dto.productIds.map((id) => ({ id }) as Product);
    }
    if (dto.categoryIds) {
      coupon.categories = dto.categoryIds.map((id) => ({ id }) as Category);
    }
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const coupon = this.couponRepository.create({
      ...dto,
      scope: dto.scope ?? CouponScope.CART,
    });
    this.applyRelations(coupon, dto);
    return this.couponRepository.save(coupon);
  }

  async findAll(page = 1, limit = 20) {
    const [coupons, total] = await this.couponRepository.findAndCount({
      relations: { products: true, categories: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    // شمار دفعات استفاده‌ی هر کوپن (تاریخچه‌ی خرید) را ضمیمه می‌کنیم
    const withCounts = await Promise.all(
      coupons.map(async (c) => ({
        ...c,
        usedCount: await this.usageRepository.count({
          where: { couponId: c.id },
        }),
      })),
    );
    return paginated(withCounts, total, page, limit);
  }

  /** تاریخچه‌ی استفاده از کوپن‌ها (خریدهای ثبت‌شده با کد تخفیف) — ادمین. */
  async findUsages(page = 1, limit = 20, couponId?: string) {
    const [usages, total] = await this.usageRepository.findAndCount({
      where: couponId ? { couponId } : {},
      relations: { coupon: true, user: true },
      order: { usedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(usages, total, page, limit);
  }

  /**
   * اعمال/اعتبارسنجی کوپن روی سبد واقعی کاربر (مدل دیجی‌کالا).
   * تخفیف فقط روی جمع اقلام واجد شرایط (بر اساس scope) حساب می‌شود.
   */
  async applyForUser(
    userId: string,
    code: string,
  ): Promise<{ coupon: Coupon; discount: number; eligibleSubtotal: number }> {
    const coupon = await this.couponRepository.findOne({
      where: { code, isActive: true },
      relations: { products: true, categories: true },
    });
    if (!coupon) throw new NotFoundException('کد تخفیف یافت نشد یا غیرفعال است');

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now)
      throw new BadRequestException('این کد تخفیف هنوز فعال نشده است');
    if (coupon.endDate && coupon.endDate < now)
      throw new BadRequestException('این کد تخفیف منقضی شده است');

    const totalUsage = await this.usageRepository.count({ where: { couponId: coupon.id } });
    if (coupon.usageLimit && totalUsage >= coupon.usageLimit) {
      throw new BadRequestException('ظرفیت استفاده از این کد تخفیف تکمیل شده است');
    }

    const userUsage = await this.usageRepository.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsage >= coupon.perUserLimit) {
      throw new BadRequestException('شما قبلاً از این کد تخفیف استفاده کرده‌اید');
    }

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: { product: true } },
    });
    if (!cart?.items?.length) {
      throw new BadRequestException('سبد خرید شما خالی است');
    }

    const lines: CouponLine[] = cart.items.map((item) => ({
      productId: item.productId,
      categoryId: item.product?.categoryId,
      unitPrice: Number(item.product?.basePrice ?? 0),
      quantity: item.quantity,
    }));

    const base = eligibleSubtotal(coupon, lines);
    if (base <= 0) {
      throw new BadRequestException('این کد تخفیف برای اقلام سبد شما معتبر نیست');
    }
    if (base < Number(coupon.minPurchase)) {
      throw new BadRequestException(
        `حداقل خرید مشمول این کد ${Number(coupon.minPurchase).toLocaleString('fa-IR')} تومان است`,
      );
    }

    const discount = calcCouponDiscount(coupon, lines);

    // ذخیره‌ی کوپن روی سبد (مدل دیجی‌کالا): هنگام ثبت سفارش دیگر بازمحاسبه نمی‌شود.
    await this.cartRepository.update(cart.id, {
      couponCode: coupon.code,
      discountAmount: discount,
    });

    return { coupon, discount, eligibleSubtotal: base };
  }

  /** حذف کوپن اعمال‌شده از سبد کاربر. */
  async removeCoupon(userId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ where: { userId } });
    if (cart) {
      await this.cartRepository.update(cart.id, {
        couponCode: null,
        discountAmount: 0,
      });
    }
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id },
      relations: { products: true, categories: true },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    Object.assign(coupon, dto);
    this.applyRelations(coupon, dto);
    return this.couponRepository.save(coupon);
  }

  async remove(id: string): Promise<void> {
    await this.couponRepository.delete(id);
  }
}
