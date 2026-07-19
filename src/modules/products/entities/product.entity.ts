import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Brand } from '../../brands/entities/brand.entity';
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

  /** ترتیب نمایش دستی (عدد بزرگ‌تر = بالاتر). برای پین‌کردن محصولات خاص. */
  @Index()
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Index()
  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  /** برند محصول (هر محصول حداکثر یک برند دارد). */
  @Index()
  @Column({ name: 'brand_id', nullable: true })
  brandId?: string;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand?: Brand;

  /**
   * دسته‌های محصول (چند‌مقداری). یک محصول می‌تواند زیرمجموعه‌ی چند دسته باشد.
   * `category`/`categoryId` بالا همچنان دسته‌ی «اصلی» (برای breadcrumb/سازگاری) است
   * و معمولاً اولین عضو همین مجموعه است.
   */
  @ManyToMany(() => Category, { cascade: false })
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

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
