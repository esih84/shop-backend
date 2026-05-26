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
import { User } from "../../users/entities/user.entity";

@Entity("blogs")
export class Blog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Index()
  @Column({ unique: true })
  slug: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "text", nullable: true })
  excerpt?: string;

  @Column({ name: "author_id", nullable: true })
  authorId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "author_id" })
  author?: User;

  @Column({ name: "featured_image", nullable: true })
  featuredImage?: string;

  @Column({ name: "published_at", nullable: true })
  publishedAt?: Date;

  @Column({ name: "is_published", default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
