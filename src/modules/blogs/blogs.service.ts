import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Blog } from "./entities/blog.entity";
import { CreateBlogDto } from "./dto/blog.dto";
import { User } from "../users/entities/user.entity";
import { paginated } from "../../common/dto/paginated-result";

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) {}

  async create(author: User, dto: CreateBlogDto): Promise<Blog> {
    const blog = this.blogRepository.create({
      ...dto,
      authorId: author.id,
      publishedAt: dto.isPublished ? new Date() : undefined,
    });
    return this.blogRepository.save(blog);
  }

  async findAll(page = 1, limit = 20) {
    const [blogs, total] = await this.blogRepository.findAndCount({
      where: { isPublished: true },
      order: { publishedAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(blogs, total, page, limit);
  }

  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({ where: { slug } });
    if (!blog) throw new NotFoundException("Blog not found");
    return blog;
  }

  async update(id: string, dto: Partial<CreateBlogDto>): Promise<Blog> {
    await this.blogRepository.update(id, {
      ...dto,
      ...(dto.isPublished ? { publishedAt: new Date() } : {}),
    });
    return this.findBySlug(id);
  }

  async remove(id: string): Promise<void> {
    await this.blogRepository.delete(id);
  }
}
