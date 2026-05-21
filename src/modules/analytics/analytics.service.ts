import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductView } from './entities/product-view.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ProductView)
    private readonly productViewRepository: Repository<ProductView>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async trackProductView(productId: string, userId?: string, sessionId?: string): Promise<void> {
    await this.productViewRepository.save(
      this.productViewRepository.create({ productId, userId, sessionId }),
    );
  }

  async getTopProducts(limit = 10) {
    return this.productViewRepository
      .createQueryBuilder('pv')
      .select('pv.productId', 'productId')
      .addSelect('COUNT(*)', 'views')
      .groupBy('pv.productId')
      .orderBy('views', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; views: string }>();
  }

  async getSalesSummary(from: Date, to: Date) {
    return this.orderRepository
      .createQueryBuilder('o')
      .select('DATE(o.createdAt)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(o.finalAmount)', 'revenue')
      .where('o.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('DATE(o.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; orders: string; revenue: string }>();
  }
}
