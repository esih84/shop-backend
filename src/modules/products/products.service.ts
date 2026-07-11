import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { Workbook } from "exceljs";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import { Product } from "./entities/product.entity";
import { ProductImage } from "./entities/product-image.entity";
import { ProductAttribute } from "./entities/product-attribute.entity";
import { Discount, DiscountType } from "./entities/discount.entity";
import { Category } from "../categories/entities/category.entity";
import {
  CreateProductDto,
  CreateDiscountDto,
  FilterProductsDto,
} from "./dto/product.dto";
import { UploadService } from "../upload/upload.service";
import { paginated } from "../../common/dto/paginated-result";
import slugify from "slugify";

export interface ImportProductsResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface ExcelColumnMap {
  name?: number;
  price?: number;
  sku?: number;
  stock?: number;
  category?: number;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    @InjectRepository(ProductAttribute)
    private readonly attributeRepository: Repository<ProductAttribute>,
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Backfill یک‌باره: محصولاتی که فقط دسته‌ی اصلی (categoryId) دارند را به جدول
   * رابطه‌ی چند‌مقداری product_categories منتقل می‌کند تا فیلترهای مبتنی بر M2M
   * برای داده‌های قدیمی هم کار کند. تکراری‌ها نادیده گرفته می‌شوند.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.productRepository.query(
        `INSERT INTO product_categories (product_id, category_id)
         SELECT id, category_id FROM products WHERE category_id IS NOT NULL
         ON CONFLICT DO NOTHING`,
      );
    } catch (err) {
      // جدول ممکن است هنوز ساخته نشده باشد (اولین اجرا با synchronize) — بی‌خطر
      this.logger.warn(
        `product_categories backfill skipped: ${(err as Error).message}`,
      );
    }
  }

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

  /**
   * جایگزینی کامل دسته‌های محصول (رابطه‌ی چند‌مقداری) با مجموعه‌ی ارسالی.
   * اگر categoryIds ارسال نشده باشد (undefined) دست نمی‌خورد؛ آرایه‌ی خالی همه را
   * پاک می‌کند. مقدار برگشتی، دسته‌ی اصلی پیشنهادی (اولین دسته) است تا در صورت
   * خالی‌بودن categoryId روی محصول ست شود.
   */
  private async syncCategories(
    productId: string,
    categoryIds?: string[],
  ): Promise<string | undefined> {
    if (categoryIds === undefined) return undefined;
    const unique = [...new Set(categoryIds.filter(Boolean))];
    const categories = unique.length
      ? await this.categoryRepository.findBy({ id: In(unique) })
      : [];
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: { categories: true },
    });
    if (product) {
      product.categories = categories;
      await this.productRepository.save(product);
    }
    return categories[0]?.id;
  }

  async create(
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const { images: _ignored, attributes, categoryIds, ...rest } = dto;
    const product = this.productRepository.create({
      ...rest,
      // دسته‌ی اصلی: اگر داده نشده اولین عضو categoryIds
      categoryId: rest.categoryId ?? categoryIds?.[0],
      slug: dto.slug || slugify(dto.name, { lower: true }),
    });

    if (files?.length) {
      product.images = await this.buildProductImages(files);
    }

    const saved = await this.productRepository.save(product);
    await this.syncAttributes(saved.id, attributes);
    const primary = await this.syncCategories(saved.id, categoryIds);
    if (primary && !saved.categoryId) {
      await this.productRepository.update(saved.id, { categoryId: primary });
    }
    await this.invalidateCache();
    return this.findById(saved.id);
  }

  /**
   * ورود گروهی محصولات از فایل اکسل. ستون‌ها منعطف تشخیص داده می‌شوند (نام الزامی،
   * قیمت/کد/موجودی/دسته اختیاری). محصولات ساخته‌شده فعال‌اند و اگر محصولی با همان
   * نام از قبل موجود باشد، ساخته نمی‌شود (بدون تکرار). خروجی خلاصه‌ی نتیجه است.
   */
  async importFromExcel(buffer: Buffer): Promise<ImportProductsResult> {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = workbook.worksheets[0];
    if (!ws) throw new BadRequestException("فایل اکسل هیچ شیتی ندارد");

    const colMap = this.mapExcelColumns(ws.getRow(1));
    if (colMap.name === undefined)
      throw new BadRequestException(
        "ستون نام کالا در اکسل پیدا نشد (مثلاً «اسم کالا» یا «نام»)",
      );

    // بارگذاری نام/اسلاگ‌های موجود برای جلوگیری از تکرار
    const existing = await this.productRepository.find({
      select: { slug: true, name: true },
    });
    const existingSlugs = new Set(existing.map((p) => p.slug));
    const existingNames = new Set(
      existing.map((p) => p.name.trim().toLowerCase()),
    );

    // بارگذاری دسته‌ها بر اساس نام (فقط اگر ستون دسته وجود داشته باشد)
    const categoriesByName = new Map<string, Category>();
    if (colMap.category !== undefined) {
      const cats = await this.categoryRepository.find();
      cats.forEach((c) => categoriesByName.set(c.name.trim().toLowerCase(), c));
    }

    const result: ImportProductsResult = {
      total: 0,
      created: 0,
      skipped: 0,
      errors: [],
    };
    const toCreate: Product[] = [];
    const seenSlugs = new Set<string>();

    const lastRow = ws.actualRowCount || ws.rowCount;
    for (let r = 2; r <= lastRow; r++) {
      const row = ws.getRow(r);
      const name = this.cellString(row.getCell(colMap.name));
      if (!name) continue; // ردیف خالی نادیده گرفته می‌شود
      result.total++;
      const trimmed = name.trim();

      if (existingNames.has(trimmed.toLowerCase())) {
        result.skipped++;
        continue;
      }

      try {
        // اسلاگ یکتا: slugify؛ اگر خالی (نام غیرلاتین) یا تکراری بود، پسوند بگیر
        let base = slugify(trimmed, { lower: true }) || `product-${r}`;
        let slug = base;
        let i = 1;
        while (
          existingSlugs.has(slug) ||
          seenSlugs.has(slug)
        ) {
          slug = `${base}-${i++}`;
        }
        seenSlugs.add(slug);
        existingNames.add(trimmed.toLowerCase());

        const product = this.productRepository.create({
          name: trimmed,
          slug,
          isActive: true,
          basePrice:
            colMap.price !== undefined
              ? this.cellNumber(row.getCell(colMap.price)) ?? 0
              : 0,
          stock:
            colMap.stock !== undefined
              ? this.cellNumber(row.getCell(colMap.stock)) ?? 0
              : 0,
        });

        if (colMap.sku !== undefined) {
          const sku = this.cellString(row.getCell(colMap.sku));
          if (sku) product.sku = sku.trim();
        }
        if (colMap.category !== undefined) {
          const catName = this.cellString(row.getCell(colMap.category));
          const cat = catName
            ? categoriesByName.get(catName.trim().toLowerCase())
            : undefined;
          if (cat) {
            product.categoryId = cat.id;
            product.categories = [cat];
          }
        }
        toCreate.push(product);
        result.created++;
      } catch (err) {
        result.errors.push({ row: r, reason: (err as Error).message });
      }
    }

    if (toCreate.length) await this.productRepository.save(toCreate);
    await this.invalidateCache();
    return result;
  }

  /** تشخیص شماره‌ی ستون‌ها از ردیف هدر اکسل (۱-based؛ منعطف نسبت به نام‌ها). */
  private mapExcelColumns(headerRow: {
    eachCell: (cb: (cell: { value: unknown }, col: number) => void) => void;
  }): ExcelColumnMap {
    const map: ExcelColumnMap = {};
    const has = (v: string, keys: string[]) =>
      keys.some((k) => v.includes(k));
    headerRow.eachCell((cell, col) => {
      const raw = this.cellString(cell as { value: unknown });
      if (!raw) return;
      const v = raw.trim().toLowerCase();
      if (map.name === undefined && has(v, ["اسم کالا", "نام", "name", "title", "کالا", "محصول"]))
        map.name = col;
      else if (map.price === undefined && has(v, ["قیمت", "نرخ", "price", "مبلغ"]))
        map.price = col;
      else if (map.sku === undefined && has(v, ["sku", "کد"]))
        map.sku = col;
      else if (map.stock === undefined && has(v, ["موجودی", "stock", "انبار", "تعداد"]))
        map.stock = col;
      else if (map.category === undefined && has(v, ["دسته", "category", "گروه"]))
        map.category = col;
    });
    return map;
  }

  private cellString(cell: { value: unknown } | undefined): string {
    const v = cell?.value;
    if (v === null || v === undefined) return "";
    if (typeof v === "object" && v !== null) {
      // رشته‌ی غنی/فرمول اکسل
      const rich = v as { text?: string; result?: unknown };
      if (typeof rich.text === "string") return rich.text;
      if (rich.result !== undefined) return String(rich.result);
      return "";
    }
    return String(v);
  }

  private cellNumber(cell: { value: unknown } | undefined): number | undefined {
    const raw = this.cellString(cell);
    if (!raw) return undefined;
    // ارقام فارسی/عربی → انگلیسی و حذف جداکننده‌ها
    const en = raw
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[,\s،]/g, "");
    const n = Number(en);
    return Number.isFinite(n) ? n : undefined;
  }

  async findAll(filter: FilterProductsDto, includeInactive = false) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);

    const qb = this.productRepository
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "cat")
      .leftJoinAndSelect("p.brand", "brand")
      .leftJoinAndSelect("p.images", "img", "img.isPrimary = true")
      .leftJoinAndSelect("p.discounts", "disc");

    // مسیر عمومی فقط محصولات فعال؛ مسیر ادمین همه را برمی‌گرداند
    if (!includeInactive) qb.andWhere("p.isActive = true");

    // فیلتر دسته بر اساس رابطه‌ی چند‌مقداری product_categories (نه فقط دسته‌ی اصلی)
    // با EXISTS تا getManyAndCount ردیف تکراری نسازد.
    if (filter.categoryId)
      qb.andWhere(
        "EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = :categoryId)",
        { categoryId: filter.categoryId },
      );
    if (filter.categorySlug)
      qb.andWhere(
        "EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = p.id AND c.slug = :categorySlug)",
        { categorySlug: filter.categorySlug },
      );
    if (filter.brandId)
      qb.andWhere("p.brandId = :brandId", { brandId: filter.brandId });
    if (filter.brandSlug)
      qb.andWhere("brand.slug = :brandSlug", { brandSlug: filter.brandSlug });
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

  /**
   * فقط محصولاتی که همین‌الان تخفیف فعال دارند (بخش «پیشنهادهای ویژه»).
   * منطق فعال‌بودن تخفیف (isActive و بازه‌ی تاریخ) کاملاً سمت بک‌اند است؛
   * فرانت فقط `discountedPrice`/`activeDiscount` را می‌خواند.
   */
  async findDiscounted(filter: FilterProductsDto) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);

    const qb = this.productRepository
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "cat")
      .leftJoinAndSelect("p.brand", "brand")
      .leftJoinAndSelect("p.images", "img", "img.isPrimary = true")
      .leftJoinAndSelect("p.discounts", "disc")
      .where("p.isActive = true")
      // فقط محصولاتی که حداقل یک تخفیف فعالِ در بازه‌ی تاریخ دارند
      .andWhere(
        `EXISTS (
           SELECT 1 FROM discounts d
           WHERE d.product_id = p.id
             AND d.is_active = true
             AND d.start_date <= NOW()
             AND d.end_date >= NOW()
         )`,
      )
      .orderBy("p.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

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
      brand: true,
      categories: true,
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
        brand: true,
        categories: true,
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
    const { attributes, categoryIds, images: _img, ...scalar } = dto;
    const patch = Object.fromEntries(
      Object.entries(scalar).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    if (Object.keys(patch).length) {
      await this.productRepository.update(id, patch);
    }

    await this.syncAttributes(id, attributes);
    const primaryCategory = await this.syncCategories(id, categoryIds);
    // اگر categoryId صریح فرستاده نشده ولی دسته‌ها تغییر کرده‌اند، دسته‌ی اصلی را هم‌راستا کن
    if (categoryIds !== undefined && patch.categoryId === undefined) {
      await this.productRepository.update(id, {
        categoryId: primaryCategory ?? undefined,
      });
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
