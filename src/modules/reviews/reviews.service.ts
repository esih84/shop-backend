import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/review.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(user: User, dto: CreateReviewDto): Promise<Review> {
    const review = this.reviewRepository.create({
      ...dto,
      userId: user.id,
    });
    return this.reviewRepository.save(review);
  }

  async findByProduct(productId: string, page = 1, limit = 20) {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { productId, isApproved: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { reviews, total, page, limit };
  }

  async getAverageRating(productId: string): Promise<{ average: number; count: number }> {
    const result = await this.reviewRepository
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'average')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId AND r.isApproved = true', { productId })
      .getRawOne<{ average: string; count: string }>();

    return {
      average: parseFloat(result?.average ?? '0') || 0,
      count: parseInt(result?.count ?? '0', 10) || 0,
    };
  }

  async approve(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.reviewRepository.update(id, { isApproved: true });
    return { ...review, isApproved: true };
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) throw new ForbiddenException();
    await this.reviewRepository.remove(review);
  }
}
