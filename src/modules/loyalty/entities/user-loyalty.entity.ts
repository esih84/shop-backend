import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LoyaltyTier } from './loyalty-tier.entity';

@Entity('user_loyalty')
export class UserLoyalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tier_id', nullable: true })
  tierId?: string;

  @ManyToOne(() => LoyaltyTier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tier_id' })
  tier?: LoyaltyTier;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints: number;

  @Column({ name: 'available_points', type: 'int', default: 0 })
  availablePoints: number;

  @Column({ name: 'total_spent', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ name: 'lifetime_orders', type: 'int', default: 0 })
  lifetimeOrders: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
