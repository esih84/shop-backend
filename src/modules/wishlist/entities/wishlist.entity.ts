import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Product } from "../../products/entities/product.entity";

@Entity("wishlists")
export class Wishlist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Index()
  @Column({ name: "product_id" })
  productId: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @CreateDateColumn({ name: "added_at" })
  addedAt: Date;
}
