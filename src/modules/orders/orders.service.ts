import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager, In } from "typeorm";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Cart } from "../cart/entities/cart.entity";
import { CartItem } from "../cart/entities/cart-item.entity";
import { CartService } from "../cart/cart.service";
import { Product } from "../products/entities/product.entity";
import { computeEffectivePrice } from "../products/product-pricing.util";
import { ProductImage } from "../products/entities/product-image.entity";
import { Coupon } from "../coupons/entities/coupon.entity";
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
import { SmsNotificationsService } from "../sms/sms-notifications.service";
import { toJalaliYmd } from "../../common/utils/jalali";

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly cartService: CartService,
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
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  // سکانس شماره‌ی سفارش را (اگر نبود) می‌سازد تا شماره‌ها امن و پیوسته باشند.
  async onModuleInit(): Promise<void> {
    await this.dataSource.query(
      "CREATE SEQUENCE IF NOT EXISTS orders_number_seq START 1001",
    );
  }

  async createFromCart(user: User, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartService.getOrCreateCart(user.id);

    if (!cart?.items?.length) {
      throw new BadRequestException("Cart is empty");
    }

    const createdOrder = await this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      let discountAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      // فقط اعتبارسنجی و محاسبه‌ی مبالغ (snapshot). موجودی اینجا کم نمی‌شود؛
      // مصرف منابع فقط هنگام تأیید موفق پرداخت در confirmPaidOrder انجام می‌گیرد.
      for (const item of cart.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          relations: { discounts: true },
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

        // قیمت مؤثر با تخفیف محصول (منبع واحد حقیقت) — روی OrderItem snapshot می‌شود.
        const { price: unitPrice } = computeEffectivePrice(
          Number(product.basePrice),
          product.discounts,
        );
        const itemTotal = unitPrice * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice: itemTotal,
        });
      }

      // کوپن به‌سبک دیجی‌کالا: تخفیف قبلاً هنگام اعمال روی سبد ذخیره شده؛ اینجا بازمحاسبه نمی‌شود.
      let appliedCouponCode: string | undefined;
      if (cart.couponCode && Number(cart.discountAmount) > 0) {
        const coupon = await manager.findOne(Coupon, {
          where: { code: cart.couponCode, isActive: true },
        });
        if (coupon) {
          const couponDiscount = Number(cart.discountAmount);
          appliedCouponCode = coupon.code;
          discountAmount += couponDiscount;
          // ثبت CouponUsage به confirmPaidOrder (پس از موفقیت پرداخت) موکول می‌شود.
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
          // خرج امتیاز به confirmPaidOrder (پس از موفقیت پرداخت) موکول می‌شود.
        }
      }

      const finalAmount = Math.max(0, totalAmount - discountAmount);

      // شماره‌ی سفارش خوانا: PL-<تاریخ شمسی>-<شماره‌ی سکانس> (مثل PL-14050416-1001)
      const seqRows = (await manager.query(
        "SELECT nextval('orders_number_seq') AS n",
      )) as Array<{ n: string }>;
      const orderNumber = `PL-${toJalaliYmd()}-${seqRows[0].n}`;

      const order = await manager.save(
        manager.create(Order, {
          userId: user.id,
          orderNumber,
          totalAmount,
          discountAmount,
          finalAmount,
          couponCode: appliedCouponCode,
          pointsRedeemed: dto.pointsToRedeem ?? 0,
          shippingAddress: dto.shippingAddress,
          shippingMethod: dto.shippingMethod,
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

      // سبد اینجا خالی نمی‌شود؛ خالی‌کردن سبد به confirmPaidOrder (پس از پرداخت موفق) موکول است.
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

  /**
   * مصرف واقعی منابع پس از پرداخت موفق — کم‌کردن موجودی، ثبت مصرف کوپن، خرج امتیاز،
   * خالی‌کردن سبد و CONFIRMED کردن سفارش. باید داخل تراکنش فراخواننده (verify پرداخت)
   * اجرا شود تا با PAID شدن پرداخت یک واحد اتمیک بسازد. اگر موجودی لحظه‌ی پرداخت کافی
   * نباشد throw می‌کند تا کل تراکنش (از جمله PAID شدن) rollback شود.
   */
  async confirmPaidOrder(
    manager: EntityManager,
    order: Order,
    paidAt: Date = new Date(),
  ): Promise<void> {
    const items = await manager.find(OrderItem, {
      where: { orderId: order.id },
    });

    // ۱) کم‌کردن موجودی با قفل و اعتبارسنجی مجدد (زمان بین ثبت سفارش و پرداخت گذشته است)
    for (const item of items) {
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
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
      await manager.update(Product, product.id, {
        stock: product.stock - item.quantity,
      });
    }

    // ۲) ثبت مصرف کوپن (تخفیف کوپن = کل تخفیف منهای معادل امتیاز خرج‌شده)
    if (order.couponCode) {
      const coupon = await manager.findOne(Coupon, {
        where: { code: order.couponCode, isActive: true },
      });
      if (coupon) {
        const couponDiscount =
          Number(order.discountAmount) - (order.pointsRedeemed ?? 0) / 100;
        await manager.save(
          manager.create(CouponUsage, {
            couponId: coupon.id,
            userId: order.userId,
            orderId: order.id,
            discountApplied: couponDiscount,
          }),
        );
      }
    }

    // ۳) خرج امتیاز وفاداری
    if (order.pointsRedeemed && order.pointsRedeemed > 0) {
      const loyalty = await manager.findOne(UserLoyalty, {
        where: { userId: order.userId },
      });
      if (loyalty && loyalty.availablePoints >= order.pointsRedeemed) {
        await manager.update(UserLoyalty, loyalty.id, {
          availablePoints: loyalty.availablePoints - order.pointsRedeemed,
          totalPoints: loyalty.totalPoints - order.pointsRedeemed,
        });
        await manager.save(
          manager.create(PointTransaction, {
            userId: order.userId,
            points: -order.pointsRedeemed,
            type: PointTransactionType.REDEEM,
            reason: "Points redeemed on order",
          }),
        );
      }
    }

    // ۴) خالی‌کردن سبد کاربر
    const cart = await manager.findOne(Cart, {
      where: { userId: order.userId },
    });
    if (cart) {
      await manager.delete(CartItem, { cartId: cart.id });
    }

    // ۵) نهایی‌کردن سفارش
    await manager.update(Order, order.id, {
      status: OrderStatus.CONFIRMED,
      paidAt,
    });
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
    await this.attachProductImages(order);
    return order;
  }

  /**
   * تصویر شاخص هر محصول را (برای آیتم‌هایی که productId دارند) از جدول
   * product_images می‌خواند و روی item.productImage می‌گذارد. آیتم‌های سفارش
   * snapshot هستند و تصویر را ذخیره نمی‌کنند؛ این‌جا فقط برای نمایش پُر می‌شود.
   */
  private async attachProductImages(order: Order): Promise<void> {
    const productIds = [
      ...new Set(
        (order.items ?? [])
          .map((it) => it.productId)
          .filter((id): id is string => !!id),
      ),
    ];
    if (productIds.length === 0) return;

    const images = await this.dataSource.getRepository(ProductImage).find({
      where: { productId: In(productIds) },
      order: { isPrimary: "DESC", order: "ASC" },
    });

    const byProduct = new Map<string, string>();
    for (const img of images) {
      // اولین تصویر هر محصول (شاخص یا کم‌ترین order) نگه داشته می‌شود
      if (!byProduct.has(img.productId)) {
        byProduct.set(img.productId, img.thumbnailUrl ?? img.mediumUrl ?? img.url);
      }
    }

    for (const item of order.items ?? []) {
      if (item.productId) {
        const url = byProduct.get(item.productId);
        if (url) item.productImage = url;
      }
    }
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await this.findById(id);
    await this.orderRepository.update(id, { status });
    const updated = await this.findById(id);
    // پیامک تغییر وضعیت — خطای آن نباید به‌روزرسانی وضعیت را بشکند
    try {
      await this.smsNotifications.sendOrderStatus(updated);
    } catch {
      /* noop */
    }
    return updated;
  }
}
