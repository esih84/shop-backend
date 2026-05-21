import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto, FilterProductsDto } from './dto/product.dto';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...dto,
      slug: dto.slug || slugify(dto.name, { lower: true }),
    });

    if (dto.variants?.length) {
      product.variants = dto.variants.map((v) =>
        this.variantRepository.create(v),
      );
    }

    const saved = await this.productRepository.save(product);
    await this.invalidateCache();
    return saved;
  }

  async findAll(filter: FilterProductsDto) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);

    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.variants', 'v', 'v.isActive = true')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .where('p.isActive = true');

    if (filter.categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId: filter.categoryId });
    if (filter.minPrice) qb.andWhere('p.basePrice >= :minPrice', { minPrice: filter.minPrice });
    if (filter.maxPrice) qb.andWhere('p.basePrice <= :maxPrice', { maxPrice: filter.maxPrice });
    if (filter.color) qb.andWhere('v.color ILIKE :color', { color: `%${filter.color}%` });
    if (filter.search) {
      qb.andWhere('(p.name ILIKE :search OR p.description ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    const sortBy = ['p.createdAt', 'p.basePrice', 'p.name'].includes(`p.${filter.sortBy}`)
      ? (`p.${filter.sortBy}` as string)
      : 'p.createdAt';
    qb.orderBy(sortBy, filter.sortOrder === 'ASC' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string): Promise<Product> {
    const cacheKey = `product:slug:${slug}`;
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productRepository.findOne({
      where: { slug, isActive: true },
      relations: ['category', 'variants', 'images', 'attributes', 'discounts'],
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.cacheManager.set(cacheKey, product, 3600000);
    return product;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'variants', 'images', 'attributes', 'discounts'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>): Promise<Product> {
    await this.findById(id);
    await this.productRepository.update(id, dto);
    await this.invalidateCache();
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
    await this.invalidateCache();
  }

  async getVariants(productId: string): Promise<ProductVariant[]> {
    return this.variantRepository.find({ where: { productId, isActive: true } });
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del('products:all');
  }
}
