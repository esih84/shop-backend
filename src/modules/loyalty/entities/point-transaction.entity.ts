import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PointTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  EXPIRE = 'expire',
  ADJUST = 'adjust',
  BONUS = 'bonus',
  REFUND = 'refund',
}

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  points: number;

  @Index()
  @Column({ type: 'enum', enum: PointTransactionType })
  type: PointTransactionType;

  @Column()
  reason: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
