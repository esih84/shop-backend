import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  getCart(@CurrentUser() user: User) {
    return this.cartService.getOrCreateCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@CurrentUser() user: User, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove cart item' })
  removeItem(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cartService.removeItem(user, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user.id);
  }
}
