import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('coupon_usages')
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'coupon_id' })
  couponId: string;

  @ManyToOne(() => Coupon, (c) => c.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Column({ name: 'discount_applied', type: 'decimal', precision: 12, scale: 2 })
  discountApplied: number;

  @CreateDateColumn({ name: 'used_at' })
  usedAt: Date;
}
