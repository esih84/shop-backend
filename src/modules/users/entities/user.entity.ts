import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../../common/decorators/roles.decorator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'referral_code', nullable: true, unique: true })
  referralCode?: string;

  @Column({ name: 'referred_by', nullable: true })
  referredBy?: string;

  // ---- فیلدهای CRM/RFM (بر اساس سفارش‌های پرداخت‌شده به‌روز می‌شوند) ----

  /** زمان آخرین خرید موفق (پرداخت‌شده) — پایه‌ی Recency. */
  @Column({ name: 'last_purchase_at', type: 'timestamptz', nullable: true })
  lastPurchaseAt?: Date;

  /** زمان اولین خرید موفق. */
  @Column({ name: 'first_purchase_at', type: 'timestamptz', nullable: true })
  firstPurchaseAt?: Date;

  /** مجموع مبلغ خریدهای پرداخت‌شده — پایه‌ی Monetary. */
  @Column({
    name: 'total_spent',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalSpent: number;

  /** تعداد سفارش‌های پرداخت‌شده — پایه‌ی Frequency. */
  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount: number;

  /** مبلغ آخرین خرید. */
  @Column({
    name: 'last_order_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  lastOrderAmount?: number;

  /** امتیازهای RFM (۱..۵) — با بازمحاسبه‌ی گروهی پر می‌شوند. */
  @Column({ name: 'rfm_r', type: 'smallint', nullable: true })
  rfmR?: number;

  @Column({ name: 'rfm_f', type: 'smallint', nullable: true })
  rfmF?: number;

  @Column({ name: 'rfm_m', type: 'smallint', nullable: true })
  rfmM?: number;

  /** برچسب سگمنت مشتری (champion/loyal/at_risk/lost/new). */
  @Index()
  @Column({ name: 'rfm_segment', nullable: true })
  rfmSegment?: string;

  /** انصراف از پیامک تبلیغاتی (کمپین‌ها این کاربران را حذف می‌کنند). */
  @Column({ name: 'sms_opt_out', default: false })
  smsOptOut: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
