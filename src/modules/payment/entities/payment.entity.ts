import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Order } from "../../orders/entities/order.entity";

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "order_id" })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ default: "zarinpal" })
  gateway: string;

  @Index()
  @Column({ nullable: true })
  authority?: string;

  @Column({ name: "ref_id", nullable: true })
  refId?: string;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
