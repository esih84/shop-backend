import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'referrer_id' })
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  @Column({ name: 'referred_id', nullable: true })
  referredId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_id' })
  referred?: User;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @Column({ name: 'referrer_reward', type: 'int', default: 0 })
  referrerReward: number;

  @Column({ name: 'referred_reward', type: 'int', default: 0 })
  referredReward: number;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
