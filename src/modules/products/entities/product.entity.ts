import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { ProductImage } from './product-image.entity';
import { ProductAttribute } from './product-attribute.entity';
import { Discount } from './discount.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Index()
  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  basePrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Index()
  @Column({ unique: true, nullable: true })
  sku?: string;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Index()
  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @OneToMany(() => ProductImage, (i) => i.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => ProductAttribute, (a) => a.product, { cascade: true })
  attributes: ProductAttribute[];

  @OneToMany(() => Discount, (d) => d.product, { cascade: true })
  discounts: Discount[];

  @OneToMany(() => Review, (r) => r.product)
  reviews: Review[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
