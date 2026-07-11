import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../orders/entities/order.entity";
import { User } from "../users/entities/user.entity";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { ZarinpalService } from "./zarinpal.service";
import { CrmService } from "../crm/crm.service";
import { SmsNotificationsService } from "../sms/sms-notifications.service";

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly zarinpal: ZarinpalService,
    private readonly config: ConfigService,
    private readonly crmService: CrmService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  /** ساخت تراکنش برای یک سفارش و گرفتن آدرس درگاه. */
  async createForOrder(
    user: User,
    orderId: string,
  ): Promise<{ gatewayUrl: string; authority: string }> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.userId !== user.id) {
      throw new NotFoundException("سفارش یافت نشد");
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("این سفارش قابل پرداخت نیست");
    }

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

    return { gatewayUrl, authority };
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

    const paidAt = new Date();
    payment.status = PaymentStatus.PAID;
    payment.refId = result.refId;
    await this.paymentRepo.save(payment);
    await this.orderRepo.update(orderId, {
      status: OrderStatus.CONFIRMED,
      paidAt,
    });

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
