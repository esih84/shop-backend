import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from './entities/order.entity';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ordersService.findUserOrders(user.id, page, limit);
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
