import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('loyalty_tiers')
export class LoyaltyTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column({ unique: true })
  slug: string;

  @Column({ name: 'min_points', type: 'int', default: 0 })
  minPoints: number;

  @Column({ name: 'min_spent', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minSpent: number;

  @Column({ name: 'discount_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number;

  @Column({ name: 'free_shipping_threshold', type: 'decimal', precision: 12, scale: 2, nullable: true })
  freeShippingThreshold?: number;

  @Column({ name: 'benefits_json', type: 'jsonb', nullable: true })
  benefits?: Record<string, unknown>;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
