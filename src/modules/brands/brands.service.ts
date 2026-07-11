import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    dto: CreateBrandDto,
    image?: Express.Multer.File,
  ): Promise<Brand> {
    const brand = this.brandRepository.create(dto);
    if (image) {
      const urls = await this.uploadService.uploadImage(image, 'brands');
      brand.imageUrl = urls.large;
    }
    return this.brandRepository.save(brand);
  }

  async findAll(): Promise<Brand[]> {
    return this.brandRepository.find({
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { slug } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(
    id: string,
    dto: Partial<CreateBrandDto>,
    image?: Express.Multer.File,
  ): Promise<Brand> {
    await this.findById(id);
    if (image) {
      const urls = await this.uploadService.uploadImage(image, 'brands');
      dto.imageUrl = urls.large;
    }
    await this.brandRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findById(id);
    await this.brandRepository.remove(brand);
  }
}
