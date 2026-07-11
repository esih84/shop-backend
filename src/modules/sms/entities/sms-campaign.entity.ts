import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SmsCampaignStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

/** کمپین پیامک تبلیغاتی با هدف‌گیری RFM و شخصی‌سازی نام/پت. */
@Entity('sms_campaigns')
export class SmsCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** متن با placeholder ({name} {pet}). */
  @Column({ type: 'text' })
  body: string;

  /** فیلتر گیرنده‌ها (CustomerFilterDto سریالایز‌شده). */
  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, unknown>;

  @Index()
  @Column({ type: 'enum', enum: SmsCampaignStatus, default: SmsCampaignStatus.DRAFT })
  status: SmsCampaignStatus;

  @Column({ name: 'total_recipients', type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ name: 'sent_count', type: 'int', default: 0 })
  sentCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
