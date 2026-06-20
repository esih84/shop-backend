import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TreeRepository } from "typeorm";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UploadService } from "../upload/upload.service";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: TreeRepository<Category>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    dto: CreateCategoryDto,
    image?: Express.Multer.File,
  ): Promise<Category> {
    const category = this.categoryRepository.create(dto);
    if (image) {
      const urls = await this.uploadService.uploadImage(image, "categories");
      category.imageUrl = urls.large;
    }
    if (dto.parentId) {
      const parent = await this.findById(dto.parentId);
      category.parent = parent;
    }
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findTrees();
  }

  async findActive(): Promise<Category[]> {
    return this.categoryRepository.findTrees();
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { slug } });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async update(
    id: string,
    dto: Partial<CreateCategoryDto>,
    image?: Express.Multer.File,
  ): Promise<Category> {
    await this.findById(id);
    if (image) {
      const urls = await this.uploadService.uploadImage(image, "categories");
      dto.imageUrl = urls.large;
    }
    await this.categoryRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findById(id);
    await this.categoryRepository.remove(category);
  }
}
