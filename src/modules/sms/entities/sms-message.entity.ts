import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SmsMessageType {
  TRANSACTIONAL = 'transactional',
  PROMOTIONAL = 'promotional',
  OTP = 'otp',
}

export enum SmsMessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

/** لاگ هر پیامک ارسال‌شده — منبع آمار و ردیابی. */
@Entity('sms_messages')
export class SmsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Index()
  @Column()
  phone: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'template_id', nullable: true })
  templateId?: string;

  @Index()
  @Column({ name: 'campaign_id', nullable: true })
  campaignId?: string;

  @Index()
  @Column({ type: 'enum', enum: SmsMessageType })
  type: SmsMessageType;

  @Index()
  @Column({ type: 'enum', enum: SmsMessageStatus, default: SmsMessageStatus.PENDING })
  status: SmsMessageStatus;

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId?: string;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
