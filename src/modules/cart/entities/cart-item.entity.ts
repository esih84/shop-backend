import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'cart_id' })
  cartId: string;

  @ManyToOne(() => Cart, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ name: 'variant_id' })
  variantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
