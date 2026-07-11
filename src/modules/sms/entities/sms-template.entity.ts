import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderStatus } from '../../orders/entities/order.entity';

/** رویدادی که این قالب پیامک را فعال می‌کند. */
export enum SmsEvent {
  /** پس از پرداخت موفق سفارش. */
  PURCHASE_PAID = 'purchase_paid',
  /** پس از تغییر وضعیت سفارش (با orderStatus مشخص می‌شود کدام وضعیت). */
  ORDER_STATUS = 'order_status',
  /** قالب پایه برای کمپین تبلیغاتی. */
  PROMOTIONAL = 'promotional',
}

@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** متن پیامک با placeholderها: {name} {pet} {orderNumber} {status} {amount} */
  @Column({ type: 'text' })
  body: string;

  @Index()
  @Column({ type: 'enum', enum: SmsEvent })
  event: SmsEvent;

  /** برای event=order_status: کدام وضعیت این پیامک را می‌زند (خالی = همه‌ی وضعیت‌ها). */
  @Column({
    name: 'order_status',
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  orderStatus?: OrderStatus;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
