import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import { Product } from "./entities/product.entity";
import { ProductImage } from "./entities/product-image.entity";
import { CreateProductDto, FilterProductsDto } from "./dto/product.dto";
import { UploadService } from "../upload/upload.service";
import { paginated } from "../../common/dto/paginated-result";
import slugify from "slugify";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * آپلود فایل‌های تصویر داخل ماژول product و ساخت رکوردهای ProductImage.
   * @param startOrder ترتیب شروع (برای ادامه‌ی تصاویر موجود هنگام ویرایش)
   * @param markFirstPrimary اولین تصویر به‌عنوان تصویر اصلی علامت بخورد
   */
  private async buildProductImages(
    files: Express.Multer.File[],
    startOrder = 0,
    markFirstPrimary = true,
  ): Promise<ProductImage[]> {
    const uploaded = await this.uploadService.uploadImages(files, "products");
    return uploaded.map((urls, i) =>
      this.imageRepository.create({
        url: urls.large,
        thumbnailUrl: urls.thumbnail,
        mediumUrl: urls.medium,
        order: startOrder + i,
        isPrimary: markFirstPrimary && i === 0,
      }),
    );
  }

  async create(
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const { images: _ignored, ...rest } = dto;
    const product = this.productRepository.create({
      ...rest,
      slug: dto.slug || slugify(dto.name, { lower: true }),
    });

    if (files?.length) {
      product.images = await this.buildProductImages(files);
    }

    const saved = await this.productRepository.save(product);
    await this.invalidateCache();
    return saved;
  }

  async findAll(filter: FilterProductsDto) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);

    const qb = this.productRepository
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "cat")
      .leftJoinAndSelect("p.images", "img", "img.isPrimary = true")
      .where("p.isActive = true");

    if (filter.categoryId)
      qb.andWhere("p.categoryId = :categoryId", {
        categoryId: filter.categoryId,
      });
    if (filter.categorySlug)
      qb.andWhere("cat.slug = :categorySlug", {
        categorySlug: filter.categorySlug,
      });
    if (filter.minPrice !== undefined)
      qb.andWhere("p.basePrice >= :minPrice", { minPrice: filter.minPrice });
    if (filter.maxPrice !== undefined)
      qb.andWhere("p.basePrice <= :maxPrice", { maxPrice: filter.maxPrice });
    if (filter.inStock) qb.andWhere("p.stock > 0");
    if (filter.search) {
      qb.andWhere(
        "(p.name ILIKE :search OR p.description ILIKE :search OR p.sku ILIKE :search)",
        { search: `%${filter.search}%` },
      );
    }

    const sortBy = ["createdAt", "basePrice", "name"].includes(
      filter.sortBy ?? "",
    )
      ? `p.${filter.sortBy}`
      : "p.createdAt";
    qb.orderBy(sortBy, filter.sortOrder === "ASC" ? "ASC" : "DESC");
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, page, limit);
  }

  async findBySlug(identifier: string): Promise<Product> {
    const cacheKey = `product:slug:${identifier}`;
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached) return cached;

    const relations = {
      category: true,
      images: true,
      attributes: true,
      discounts: true,
    };

    // ابتدا با slug؛ اگر مقدار یک UUID بود (مثلاً لینک‌هایی که id می‌فرستند)
    // به جستجو با id برمی‌گردیم تا صفحه‌ی محصول از هر دو حالت کار کند.
    let product = await this.productRepository.findOne({
      where: { slug: identifier, isActive: true },
      relations,
    });

    if (!product && this.isUuid(identifier)) {
      product = await this.productRepository.findOne({
        where: { id: identifier, isActive: true },
        relations,
      });
    }

    if (!product) throw new NotFoundException("Product not found");

    await this.cacheManager.set(cacheKey, product, 3600000);
    return product;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        category: true,
        images: true,
        attributes: true,
        discounts: true,
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(
    id: string,
    dto: Partial<CreateProductDto>,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const existing = await this.findById(id);
    // فقط ستون‌های اسکالر به update داده می‌شوند؛ روابط جداگانه مدیریت می‌شوند
    const { attributes: _a, images: _img, ...scalar } = dto;
    if (Object.keys(scalar).length) {
      await this.productRepository.update(id, scalar);
    }

    if (files?.length) {
      const hasImages = (existing.images?.length ?? 0) > 0;
      const newImages = await this.buildProductImages(
        files,
        existing.images?.length ?? 0,
        !hasImages, // اگر تصویری ندارد، اولین تصویر جدید اصلی می‌شود
      );
      newImages.forEach((img) => (img.productId = id));
      await this.imageRepository.save(newImages);
    }

    await this.invalidateCache();
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del("products:all");
  }
}
