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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
