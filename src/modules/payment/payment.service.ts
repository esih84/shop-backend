import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Order, OrderStatus } from "../orders/entities/order.entity";
import { User } from "../users/entities/user.entity";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { ZarinpalService } from "./zarinpal.service";
import { CrmService } from "../crm/crm.service";
import { SmsNotificationsService } from "../sms/sms-notifications.service";
import { OrdersService } from "../orders/orders.service";
import { CreateOrderDto } from "../orders/dto/order.dto";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly zarinpal: ZarinpalService,
    private readonly config: ConfigService,
    private readonly crmService: CrmService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly ordersService: OrdersService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * چک‌اوت یک‌مرحله‌ای (مثل اسنپ‌فود): از روی سبد کاربر سفارش PENDING می‌سازد،
   * سپس تراکنش پرداخت را ساخته و آدرس درگاه را برمی‌گرداند — همه در یک درخواست.
   * مصرف منابع (موجودی/کوپن/امتیاز/سبد) هنگام تأیید موفق پرداخت انجام می‌شود، نه اینجا.
   */
  async checkout(
    user: User,
    dto: CreateOrderDto,
  ): Promise<{ gatewayUrl: string; authority: string; orderId: string }> {
    const order = await this.ordersService.createFromCart(user, dto);
    return this.startPayment(user, order);
  }

  /**
   * پرداخت مجدد یک سفارشِ موجودِ PENDING (برای دکمه‌ی «تلاش مجدد پرداخت»).
   * سفارش تازه‌ای ساخته نمی‌شود؛ فقط برای همان سفارش تراکنش جدید می‌سازد.
   */
  async createForOrder(
    user: User,
    orderId: string,
  ): Promise<{ gatewayUrl: string; authority: string; orderId: string }> {
    const order = await this.ordersService.findById(orderId, user.id);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("این سفارش قابل پرداخت نیست");
    }
    return this.startPayment(user, order);
  }

  /** ساخت رکورد پرداخت برای یک سفارش و گرفتن آدرس درگاه زرین‌پال. */
  private async startPayment(
    user: User,
    order: Order,
  ): Promise<{ gatewayUrl: string; authority: string; orderId: string }> {
    const amount = Number(order.finalAmount);
    if (!(amount > 0)) {
      throw new BadRequestException("مبلغ سفارش نامعتبر است");
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId: order.id,
        userId: user.id,
        amount,
        status: PaymentStatus.PENDING,
      }),
    );

    const appUrl = this.config.get<string>("app.url");
    const { authority, gatewayUrl } = await this.zarinpal.request({
      amount,
      description: `پرداخت سفارش ${order.orderNumber ?? order.id}`,
      callbackUrl: `${appUrl}/api/v1/payments/verify`,
      mobile: user.phone,
      email: user.email ?? undefined,
    });

    payment.authority = authority;
    await this.paymentRepo.save(payment);

    return { gatewayUrl, authority, orderId: order.id };
  }

  /**
   * تأیید بازگشت از درگاه. آدرس بازگشت به فروشگاه را برمی‌گرداند تا کنترلر
   * کاربر را redirect کند.
   */
  async verify(authority: string, status: string): Promise<string> {
    const frontendUrl = this.config.get<string>("app.frontendUrl");

    const payment = await this.paymentRepo.findOne({
      where: { authority },
      relations: { order: true },
    });
    if (!payment) {
      return `${frontendUrl}/payment/callback?status=failed`;
    }

    const orderId = payment.orderId;
    const failUrl = `${frontendUrl}/payment/callback?status=failed&orderId=${orderId}`;
    const successUrl = (refId?: string) =>
      `${frontendUrl}/payment/callback?status=success&orderId=${orderId}&refId=${refId ?? ""}`;

    // پرداختِ قبلاً موفق → همان نتیجه
    if (payment.status === PaymentStatus.PAID) {
      return successUrl(payment.refId);
    }

    if (status !== "OK") {
      if (payment.status === PaymentStatus.PENDING) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepo.save(payment);
      }
      return failUrl;
    }

    const result = await this.zarinpal.verify({
      authority,
      amount: Number(payment.amount),
    });

    if (!result.ok) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      return failUrl;
    }

    // مصرف منابع (موجودی/کوپن/امتیاز/سبد) + CONFIRMED شدن سفارش + PAID شدن پرداخت،
    // همه در یک تراکنش اتمیک. اگر موجودی لحظه‌ی پرداخت کافی نباشد کل تراکنش rollback می‌شود.
    const paidAt = new Date();
    let confirmed: boolean;
    try {
      confirmed = await this.dataSource.transaction(async (manager) => {
        const order = await manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: "pessimistic_write" },
        });
        // idempotency: اگر سفارش دیگر PENDING نباشد (مثلاً callback تکراری) دوباره مصرف نمی‌کنیم.
        if (!order || order.status !== OrderStatus.PENDING) {
          return false;
        }
        await this.ordersService.confirmPaidOrder(manager, order, paidAt);
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.PAID,
          refId: result.refId,
        });
        return true;
      });
    } catch (err) {
      // پرداخت در درگاه موفق بوده ولی تأیید سفارش شکست خورد (مثلاً اتمام موجودی لحظه‌ی پرداخت).
      // کل تراکنش rollback شده و داده نیم‌بند نمانده؛ اما پول گرفته شده و نیاز به بازگشت‌وجه دستی است.
      this.logger.error(
        `تأیید سفارش ${orderId} پس از پرداخت موفق ${payment.id} شکست خورد — نیازمند بازگشت‌وجه دستی`,
        err instanceof Error ? err.stack : String(err),
      );
      return failUrl;
    }

    if (!confirmed) {
      // سفارش دیگر PENDING نبود. اگر پرداخت قبلاً PAID شده (callback موازی/تکراری) نتیجه موفق است؛
      // در غیر این صورت پول در درگاه گرفته شده ولی سفارش قابل‌تأیید نیست و نیازمند بازگشت‌وجه دستی است.
      const fresh = await this.paymentRepo.findOne({
        where: { id: payment.id },
      });
      if (fresh?.status === PaymentStatus.PAID) {
        return successUrl(fresh.refId);
      }
      this.logger.error(
        `پرداخت ${payment.id} در درگاه موفق شد ولی سفارش ${orderId} قابل‌تأیید نبود (وضعیت ≠ PENDING) — نیازمند بازگشت‌وجه/رسیدگی دستی`,
      );
      return failUrl;
    }

    // به‌روزرسانی RFM و ارسال پیامک تأیید خرید — هیچ‌کدام نباید جریان پرداخت را بشکند
    try {
      await this.crmService.recordPurchase(
        payment.userId,
        Number(payment.amount),
        paidAt,
      );
    } catch {
      /* noop */
    }
    try {
      await this.smsNotifications.sendPurchaseConfirmation(orderId);
    } catch {
      /* noop */
    }

    return successUrl(result.refId);
  }
}
