import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/** روش‌های حمل‌ونقل. افزودن روش جدید = یک خط اینجا + یک آیتم در SHIPPING_METHODS فرانت. */
export enum ShippingMethod {
  TIPAX = 'tipax',
  POST = 'post',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'order_number', nullable: true })
  orderNumber?: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  totalAmount: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({
    name: 'final_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  finalAmount: number;

  @Column({ name: 'coupon_code', nullable: true })
  couponCode?: string;

  @Column({ name: 'points_redeemed', type: 'int', default: 0 })
  pointsRedeemed: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'jsonb', name: 'shipping_address', nullable: true })
  shippingAddress?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: ShippingMethod,
    name: 'shipping_method',
    nullable: true,
  })
  shippingMethod?: ShippingMethod;

  /** زمان پرداخت موفق (برای گزارش recency/monetary و دوره‌ی بازگشت خرید). */
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
