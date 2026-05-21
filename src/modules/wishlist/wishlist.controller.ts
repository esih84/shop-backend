import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

class AddWishlistItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() variantId?: string;
}

@ApiTags('wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: User) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post()
  addItem(@CurrentUser() user: User, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.addItem(user.id, dto.productId, dto.variantId);
  }

  @Delete(':productId')
  removeItem(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.removeItem(user.id, productId);
  }
}
