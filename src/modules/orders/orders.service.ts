import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Cart } from "../cart/entities/cart.entity";
import { CartItem } from "../cart/entities/cart-item.entity";
import { Product } from "../products/entities/product.entity";
import { Coupon, CouponType } from "../coupons/entities/coupon.entity";
import { CouponUsage } from "../coupons/entities/coupon-usage.entity";
import { UserLoyalty } from "../loyalty/entities/user-loyalty.entity";
import {
  PointTransaction,
  PointTransactionType,
} from "../loyalty/entities/point-transaction.entity";
import { CreateOrderDto } from "./dto/order.dto";
import { User } from "../users/entities/user.entity";
import { paginated } from "../../common/dto/paginated-result";
import { PetsService } from "../pets/pets.service";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly couponUsageRepository: Repository<CouponUsage>,
    @InjectRepository(UserLoyalty)
    private readonly userLoyaltyRepository: Repository<UserLoyalty>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    private readonly dataSource: DataSource,
    private readonly petsService: PetsService,
  ) {}

  async createFromCart(user: User, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartRepository.findOne({
      where: { userId: user.id },
      relations: { items: { product: true } },
    });

    if (!cart?.items?.length) {
      throw new BadRequestException("Cart is empty");
    }

    const createdOrder = await this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      let discountAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      // Validate stock and calculate total
      for (const item of cart.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: "pessimistic_write" },
        });

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Product ${item.productId} is no longer available`,
          );
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }

        const itemTotal = Number(product.basePrice) * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: Number(product.basePrice),
          totalPrice: itemTotal,
        });

        // Reduce stock
        await manager.update(Product, product.id, {
          stock: product.stock - item.quantity,
        });
      }

      // Apply coupon
      if (dto.couponCode) {
        const coupon = await manager.findOne(Coupon, {
          where: { code: dto.couponCode, isActive: true },
        });
        if (coupon) {
          const usageCount = await manager.count(CouponUsage, {
            where: { couponId: coupon.id },
          });
          const userUsageCount = await manager.count(CouponUsage, {
            where: { couponId: coupon.id, userId: user.id },
          });

          if (
            (!coupon.usageLimit || usageCount < coupon.usageLimit) &&
            userUsageCount < coupon.perUserLimit &&
            totalAmount >= Number(coupon.minPurchase) &&
            (!coupon.startDate || coupon.startDate <= new Date()) &&
            (!coupon.endDate || coupon.endDate >= new Date())
          ) {
            if (coupon.type === CouponType.PERCENTAGE) {
              discountAmount = (totalAmount * Number(coupon.value)) / 100;
              if (coupon.maxDiscount) {
                discountAmount = Math.min(
                  discountAmount,
                  Number(coupon.maxDiscount),
                );
              }
            } else if (coupon.type === CouponType.FIXED) {
              discountAmount = Math.min(Number(coupon.value), totalAmount);
            }

            await manager.save(
              manager.create(CouponUsage, {
                couponId: coupon.id,
                userId: user.id,
                discountApplied: discountAmount,
              }),
            );
          }
        }
      }

      // Apply loyalty points
      let pointsRedeemedAmount = 0;
      if (dto.pointsToRedeem && dto.pointsToRedeem > 0) {
        const loyalty = await manager.findOne(UserLoyalty, {
          where: { userId: user.id },
        });
        if (loyalty && loyalty.availablePoints >= dto.pointsToRedeem) {
          pointsRedeemedAmount = dto.pointsToRedeem / 100; // 100 points = 1 currency unit
          discountAmount += pointsRedeemedAmount;

          await manager.update(UserLoyalty, loyalty.id, {
            availablePoints: loyalty.availablePoints - dto.pointsToRedeem,
            totalPoints: loyalty.totalPoints - dto.pointsToRedeem,
          });

          await manager.save(
            manager.create(PointTransaction, {
              userId: user.id,
              points: -dto.pointsToRedeem,
              type: PointTransactionType.REDEEM,
              reason: "Points redeemed on order",
            }),
          );
        }
      }

      const finalAmount = Math.max(0, totalAmount - discountAmount);

      const order = await manager.save(
        manager.create(Order, {
          userId: user.id,
          totalAmount,
          discountAmount,
          finalAmount,
          couponCode: dto.couponCode,
          pointsRedeemed: dto.pointsToRedeem ?? 0,
          shippingAddress: dto.shippingAddress,
          items: orderItems as OrderItem[],
        }),
      );

      // ذخیره‌ی نام/نام‌خانوادگی گیرنده روی پروفایل کاربر برای پیش‌پُرکردن سفارش‌های بعدی
      const sa = dto.shippingAddress;
      if (sa) {
        const patch: Partial<User> = {};
        if (typeof sa.firstName === "string" && sa.firstName.trim())
          patch.firstName = sa.firstName.trim();
        if (typeof sa.lastName === "string" && sa.lastName.trim())
          patch.lastName = sa.lastName.trim();
        if (Object.keys(patch).length) {
          await manager.update(User, user.id, patch);
        }
      }

      // Clear cart
      await manager.delete(CartItem, { cartId: cart.id });

      return order;
    });

    // ذخیره‌ی نام پت در جدول پت‌ها؛ خطای آن نباید ثبت سفارش را شکست دهد
    const petName = dto.shippingAddress?.petName;
    if (typeof petName === "string" && petName.trim()) {
      try {
        await this.petsService.ensureByName(user.id, petName);
      } catch {}
    }

    return createdOrder;
  }

  async findUserOrders(userId: string, page = 1, limit = 20) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      relations: { items: true },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(orders, total, page, limit);
  }

  /** لیست همه‌ی سفارش‌ها (ادمین) */
  async findAllOrders(page = 1, limit = 20) {
    const [orders, total] = await this.orderRepository.findAndCount({
      relations: { items: true, user: true },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(orders, total, page, limit);
  }

  async findById(id: string, userId?: string): Promise<Order> {
    const where: { id: string; userId?: string } = { id };
    if (userId) where.userId = userId;

    const order = await this.orderRepository.findOne({
      where,
      relations: { items: true, user: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await this.findById(id);
    await this.orderRepository.update(id, { status });
    return this.findById(id);
  }
}
