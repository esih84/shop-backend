import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  phone: string;

  @Column()
  code: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'attempts', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
