import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("banners")
export class Banner {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ name: "image_url" })
  imageUrl: string;

  @Column({ name: "mobile_image_url", nullable: true })
  mobileImageUrl?: string;

  @Column({ nullable: true })
  link?: string;

  @Column({ default: "home" })
  position: string;

  @Column({ default: 0 })
  order: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "start_date", nullable: true })
  startDate?: Date;

  @Column({ name: "end_date", nullable: true })
  endDate?: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
