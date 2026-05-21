import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCollectionDto } from './dto/collection.dto';

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
      collection.products = await this.productRepository.findBy({ id: In(productIds) });
    }
    return this.collectionRepository.save(collection);
  }

  async findAll() {
    return this.collectionRepository.find({ where: { isActive: true } });
  }

  async findBySlug(slug: string): Promise<Collection> {
    const col = await this.collectionRepository.findOne({
      where: { slug },
      relations: ['products', 'products.images'],
    });
    if (!col) throw new NotFoundException('Collection not found');
    return col;
  }

  async update(id: string, dto: Partial<CreateCollectionDto>): Promise<Collection> {
    const { productIds, ...rest } = dto;
    await this.collectionRepository.update(id, rest);
    if (productIds) {
      const collection = await this.collectionRepository.findOne({ where: { id }, relations: ['products'] });
      if (!collection) throw new NotFoundException();
      collection.products = await this.productRepository.findBy({ id: In(productIds) });
      return this.collectionRepository.save(collection);
    }
    return this.findBySlug(id);
  }

  async remove(id: string): Promise<void> {
    await this.collectionRepository.delete(id);
  }
}
