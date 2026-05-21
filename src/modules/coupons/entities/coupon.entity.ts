import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { CouponUsage } from './coupon-usage.entity';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  code: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({ name: 'min_purchase', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minPurchase: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount?: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit?: number;

  @Column({ name: 'per_user_limit', type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ name: 'start_date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', nullable: true })
  endDate?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToMany(() => Product)
  @JoinTable({ name: 'coupon_products', joinColumn: { name: 'coupon_id' }, inverseJoinColumn: { name: 'product_id' } })
  products: Product[];

  @ManyToMany(() => Category)
  @JoinTable({ name: 'coupon_categories', joinColumn: { name: 'coupon_id' }, inverseJoinColumn: { name: 'category_id' } })
  categories: Category[];

  @OneToMany(() => CouponUsage, (u) => u.coupon)
  usages: CouponUsage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
