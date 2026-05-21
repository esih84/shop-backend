import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cart } from '../../cart/entities/cart.entity';

@Entity('abandoned_carts')
export class AbandonedCart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'cart_id', nullable: true })
  cartId?: string;

  @ManyToOne(() => Cart, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cart_id' })
  cart?: Cart;

  @Column({ name: 'reminder_count', type: 'int', default: 0 })
  reminderCount: number;

  @Column({ name: 'last_reminder_at', nullable: true })
  lastReminderAt?: Date;

  @Column({ default: false })
  recovered: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
