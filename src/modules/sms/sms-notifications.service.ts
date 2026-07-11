import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Pet } from '../pets/entities/pet.entity';
import { SmsService } from './sms.service';
import { SmsEvent } from './entities/sms-template.entity';
import { SmsMessageType } from './entities/sms-message.entity';

/** برچسب فارسی وضعیت سفارش برای متن پیامک. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'در انتظار پرداخت',
  [OrderStatus.CONFIRMED]: 'تأیید شد',
  [OrderStatus.PROCESSING]: 'در حال آماده‌سازی',
  [OrderStatus.SHIPPED]: 'ارسال شد',
  [OrderStatus.DELIVERED]: 'تحویل شد',
  [OrderStatus.CANCELLED]: 'لغو شد',
  [OrderStatus.REFUNDED]: 'مرجوع شد',
};

/**
 * تریگرهای پیامک تراکنشی. همه‌ی متدها امن‌اند و در صورت نبود قالب فعال فقط
 * برمی‌گردند (بدون خطا) تا جریان اصلی سفارش/پرداخت را نشکنند.
 */
@Injectable()
export class SmsNotificationsService {
  private readonly logger = new Logger(SmsNotificationsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
    private readonly smsService: SmsService,
  ) {}

  private async firstPetName(userId: string): Promise<string | undefined> {
    const pet = await this.petRepo.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return pet?.name;
  }

  private formatAmount(amount: number): string {
    return Number(amount).toLocaleString('fa-IR');
  }

  /** پیامک تأیید خرید پس از پرداخت موفق. */
  async sendPurchaseConfirmation(orderId: string): Promise<void> {
    const template = await this.smsService.findActiveTemplate(
      SmsEvent.PURCHASE_PAID,
    );
    if (!template) return;

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { user: true },
    });
    if (!order?.user?.phone) return;

    const petName = await this.firstPetName(order.userId);
    const message = this.smsService.renderTemplate(template.body, {
      name: order.user.firstName ?? '',
      pet: petName ?? '',
      orderNumber: order.orderNumber ?? '',
      status: ORDER_STATUS_LABELS[order.status] ?? '',
      amount: this.formatAmount(Number(order.finalAmount)),
    });

    await this.smsService.sendMessage(order.user.phone, message, {
      userId: order.userId,
      templateId: template.id,
      type: SmsMessageType.TRANSACTIONAL,
    });
  }

  /** پیامک پس از تغییر وضعیت سفارش. order باید با رابطه‌ی user لود شده باشد. */
  async sendOrderStatus(order: Order): Promise<void> {
    const template = await this.smsService.findActiveTemplate(
      SmsEvent.ORDER_STATUS,
      order.status,
    );
    if (!template) return;

    const user = order.user;
    if (!user?.phone) return;

    const petName = await this.firstPetName(order.userId);
    const message = this.smsService.renderTemplate(template.body, {
      name: user.firstName ?? '',
      pet: petName ?? '',
      orderNumber: order.orderNumber ?? '',
      status: ORDER_STATUS_LABELS[order.status] ?? '',
      amount: this.formatAmount(Number(order.finalAmount)),
    });

    await this.smsService.sendMessage(user.phone, message, {
      userId: order.userId,
      templateId: template.id,
      type: SmsMessageType.TRANSACTIONAL,
    });
  }
}
