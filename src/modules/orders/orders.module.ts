import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponUsage } from '../coupons/entities/coupon-usage.entity';
import { UserLoyalty } from '../loyalty/entities/user-loyalty.entity';
import { PointTransaction } from '../loyalty/entities/point-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order, OrderItem, Cart, CartItem, Product,
      Coupon, CouponUsage, UserLoyalty, PointTransaction,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
