import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Collection } from "./entities/collection.entity";
import { Product } from "../products/entities/product.entity";
import { CreateCollectionDto } from "./dto/collection.dto";
import { paginated } from "../../common/dto/paginated-result";

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateCollectionDto): Promise<Collection> {
    const { productIds, ...rest } = dto;
    const collection = this.collectionRepository.create(rest);
    if (productIds?.length) {
      collection.products = await this.productRepository.findBy({
        id: In(productIds),
      });
    }
    return this.collectionRepository.save(collection);
  }

  async findAll() {
    return this.collectionRepository.find({ where: { isActive: true } });
  }

  /** لیست همه‌ی کالکشن‌ها (شامل غیرفعال) با صفحه‌بندی — پنل ادمین */
  async findAllAdmin(page = 1, limit = 20) {
    const [data, total] = await this.collectionRepository.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(data, total, page, limit);
  }

  async findBySlug(slug: string): Promise<Collection> {
    const col = await this.collectionRepository.findOne({
      where: { slug },
      relations: { products: { images: true } },
    });
    if (!col) throw new NotFoundException("Collection not found");
    return col;
  }

  async update(
    id: string,
    dto: Partial<CreateCollectionDto>,
  ): Promise<Collection> {
    const { productIds, ...rest } = dto;
    await this.collectionRepository.update(id, rest);
    if (productIds) {
      const collection = await this.collectionRepository.findOne({
        where: { id },
        relations: {
          products: true,
        },
      });
      if (!collection) throw new NotFoundException();
      collection.products = await this.productRepository.findBy({
        id: In(productIds),
      });
      return this.collectionRepository.save(collection);
    }
    return this.findBySlug(id);
  }

  async remove(id: string): Promise<void> {
    await this.collectionRepository.delete(id);
  }
}
