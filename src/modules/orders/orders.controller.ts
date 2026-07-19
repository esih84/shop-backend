import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from './entities/order.entity';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ثبت سفارش دیگر endpoint مستقلی ندارد؛ ساخت سفارش از سبد فقط از مسیر چک‌اوت
  // پرداخت انجام می‌شود (POST /payments) تا سفارش و پرداخت یک واحد باشند.

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ordersService.findUserOrders(user.id, page, limit);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all orders (admin)' })
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.ordersService.findAllOrders(Number(page), Number(limit));
  }

  @Get('admin/user/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List a specific user orders (admin)' })
  findUserOrdersAdmin(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ordersService.findUserOrders(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Get('admin/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get any order details (admin)' })
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ordersService.findById(id, user.id);
  }

  @Put(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status);
  }
}
