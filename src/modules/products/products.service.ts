import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import { Product } from "./entities/product.entity";
import { ProductImage } from "./entities/product-image.entity";
import { ProductAttribute } from "./entities/product-attribute.entity";
import { Discount, DiscountType } from "./entities/discount.entity";
import {
  CreateProductDto,
  CreateDiscountDto,
  FilterProductsDto,
} from "./dto/product.dto";
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
    @InjectRepository(ProductAttribute)
    private readonly attributeRepository: Repository<ProductAttribute>,
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * تخفیف فعال محصول را در تاریخ جاری پیدا می‌کند (isActive و در بازه‌ی تاریخ).
   * اگر چند تخفیف فعال باشد، تخفیفی که بیشترین کاهش قیمت را می‌دهد انتخاب می‌شود.
   * سپس `discountedPrice` و `activeDiscount` را روی محصول ست می‌کند تا در پاسخ بیاید.
   */
  private applyDiscount(product: Product): Product {
    const now = Date.now();
    const base = Number(product.basePrice);
    let bestPrice = base;
    let best: Discount | null = null;

    for (const d of product.discounts ?? []) {
      if (!d.isActive) continue;
      if (d.startDate && new Date(d.startDate).getTime() > now) continue;
      if (d.endDate && new Date(d.endDate).getTime() < now) continue;
      const price =
        d.type === DiscountType.PERCENTAGE
          ? base - (base * Number(d.value)) / 100
          : base - Number(d.value);
      const clamped = Math.max(0, Math.round(price));
      if (clamped < bestPrice) {
        bestPrice = clamped;
        best = d;
      }
    }

    (product as Product & { discountedPrice: number }).discountedPrice =
      bestPrice;
    (product as Product & { activeDiscount: Discount | null }).activeDiscount =
      best;
    return product;
  }

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

  /**
   * جایگزینی کامل مشخصات (attributes) محصول با مجموعه‌ی ارسالی.
   * اگر attributes ارسال نشده باشد (undefined) دست نمی‌خورد؛ اگر آرایه‌ی
   * خالی باشد همه پاک می‌شوند. مدیریت صریح به‌جای اتکا به cascade تا در هر دو
   * مسیر JSON و multipart مطمئن ذخیره شوند.
   */
  private async syncAttributes(
    productId: string,
    attributes?: { key: string; value: string }[],
  ): Promise<void> {
    if (attributes === undefined) return;
    await this.attributeRepository.delete({ productId });
    const rows = attributes
      .filter((a) => a.key && a.value)
      .map((a) =>
        this.attributeRepository.create({
          productId,
          key: a.key,
          value: a.value,
        }),
      );
    if (rows.length) await this.attributeRepository.save(rows);
  }

  async create(
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const { images: _ignored, attributes, ...rest } = dto;
    const product = this.productRepository.create({
      ...rest,
      slug: dto.slug || slugify(dto.name, { lower: true }),
    });

    if (files?.length) {
      product.images = await this.buildProductImages(files);
    }

    const saved = await this.productRepository.save(product);
    await this.syncAttributes(saved.id, attributes);
    await this.invalidateCache();
    return this.findById(saved.id);
  }

  async findAll(filter: FilterProductsDto, includeInactive = false) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);

    const qb = this.productRepository
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "cat")
      .leftJoinAndSelect("p.images", "img", "img.isPrimary = true")
      .leftJoinAndSelect("p.discounts", "disc");

    // مسیر عمومی فقط محصولات فعال؛ مسیر ادمین همه را برمی‌گرداند
    if (!includeInactive) qb.andWhere("p.isActive = true");

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
    items.forEach((p) => this.applyDiscount(p));
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

    this.sortImages(product);
    this.applyDiscount(product);
    await this.cacheManager.set(cacheKey, product, 3600000);
    return product;
  }

  /** تصاویر محصول را بر اساس فیلد order مرتب می‌کند (برای اسلایدر و پنل ادمین). */
  private sortImages(product: Product): Product {
    if (product.images?.length) {
      product.images.sort((a, b) => a.order - b.order);
    }
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
    this.sortImages(product);
    return this.applyDiscount(product);
  }

  /**
   * دریافت محصول با شناسه برای پنل ادمین — برخلاف findBySlug فیلتر
   * isActive ندارد و کش نمی‌کند، تا محصولات غیرفعال هم برای ویرایش
   * در دسترس باشند. همه‌ی روابط (مشخصات/تصاویر) را برمی‌گرداند.
   */
  async findByIdAdmin(id: string): Promise<Product> {
    return this.findById(id);
  }

  async update(
    id: string,
    dto: Partial<CreateProductDto>,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    id = id.trim();
    const existing = await this.findById(id);
    // فقط ستون‌های اسکالر به update داده می‌شوند؛ روابط جداگانه مدیریت می‌شوند.
    // فیلدهای ارسال‌نشده (undefined/null) یا رشته‌ی خالی نادیده گرفته می‌شوند تا
    // مقدار قبلی محصول حفظ شود (به‌جای بازنویسی با مقدار خالی).
    const { attributes, images: _img, ...scalar } = dto;
    const patch = Object.fromEntries(
      Object.entries(scalar).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    if (Object.keys(patch).length) {
      await this.productRepository.update(id, patch);
    }

    await this.syncAttributes(id, attributes);

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

    const updated = await this.findById(id);
    // کش با slug قدیمی و جدید (و id) باید پاک شود چون findBySlug با هر دو کش می‌کند
    await this.invalidateCache(existing, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
    await this.invalidateCache(product);
  }

  /** افزودن تخفیف به محصول. محصول به‌روزشده (با قیمت مؤثر) برگردانده می‌شود. */
  async addDiscount(
    productId: string,
    dto: CreateDiscountDto,
  ): Promise<Product> {
    productId = productId.trim();
    const product = await this.findById(productId);
    const discount = this.discountRepository.create({
      productId: product.id,
      type: dto.type,
      value: dto.value,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isActive: dto.isActive ?? true,
    });
    await this.discountRepository.save(discount);
    const updated = await this.findById(productId);
    await this.invalidateCache(updated);
    return updated;
  }

  /** حذف یک تخفیف از محصول. */
  async removeDiscount(
    productId: string,
    discountId: string,
  ): Promise<Product> {
    productId = productId.trim();
    const discount = await this.discountRepository.findOne({
      where: { id: discountId, productId },
    });
    if (!discount) throw new NotFoundException("Discount not found");
    await this.discountRepository.remove(discount);
    const updated = await this.findById(productId);
    await this.invalidateCache(updated);
    return updated;
  }

  /** حذف یک تصویر محصول. اگر تصویر اصلی حذف شود، اولین تصویر باقی‌مانده اصلی می‌شود. */
  async deleteImage(productId: string, imageId: string): Promise<Product> {
    productId = productId.trim();
    const product = await this.findById(productId);
    const image = product.images?.find((img) => img.id === imageId);
    if (!image) throw new NotFoundException("Product image not found");

    await this.imageRepository.delete({ id: imageId, productId });

    // اگر تصویر حذف‌شده اصلی بود، اولین تصویر باقی‌مانده (کمترین order) اصلی شود.
    if (image.isPrimary) {
      const remaining = await this.imageRepository.find({
        where: { productId },
        order: { order: "ASC" },
      });
      if (remaining.length) {
        remaining[0].isPrimary = true;
        await this.imageRepository.save(remaining[0]);
      }
    }

    const updated = await this.findById(productId);
    await this.invalidateCache(updated);
    return updated;
  }

  /**
   * تغییر ترتیب تصاویر محصول. آرایه‌ی imageIds ترتیب جدید است؛ order هر تصویر
   * برابر اندیس آن می‌شود و اولین تصویر به‌عنوان تصویر اصلی علامت می‌خورد.
   */
  async reorderImages(productId: string, imageIds: string[]): Promise<Product> {
    productId = productId.trim();
    const product = await this.findById(productId);
    const existingIds = new Set(product.images?.map((img) => img.id));

    // فقط شناسه‌هایی که واقعاً متعلق به این محصول هستند اعمال می‌شوند.
    const ordered = imageIds.filter((id) => existingIds.has(id));

    await Promise.all(
      ordered.map((id, index) =>
        this.imageRepository.update(
          { id, productId },
          { order: index, isPrimary: index === 0 },
        ),
      ),
    );

    const updated = await this.findById(productId);
    await this.invalidateCache(updated);
    return updated;
  }

  /**
   * پاک‌سازی کش لیست و کش صفحه‌ی محصول. برای هر محصول کلید slug و id
   * (هر دو حالتی که findBySlug با آن کش می‌کند) و در صورت تغییر slug، مقدار
   * قبلی نیز حذف می‌شود.
   */
  private async invalidateCache(
    ...products: { id: string; slug: string }[]
  ): Promise<void> {
    const keys = new Set<string>(["products:all"]);
    for (const product of products) {
      if (!product) continue;
      keys.add(`product:slug:${product.id}`);
      keys.add(`product:slug:${product.slug}`);
    }
    await Promise.all([...keys].map((key) => this.cacheManager.del(key)));
  }
}
