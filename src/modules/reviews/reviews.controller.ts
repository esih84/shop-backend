import { Controller, Get, Post, Delete, Body, Param, Query, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a review' })
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user, dto);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all reviews (admin)' })
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.reviewsService.findAllForAdmin(Number(page), Number(limit));
  }

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a product' })
  findByProduct(
    @Param('productId') productId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reviewsService.findByProduct(productId, page, limit);
  }

  @Put(':id/approve')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approve a review (admin)' })
  approve(@Param('id') id: string) {
    return this.reviewsService.approve(id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a review' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reviewsService.remove(id, user.id, user.role === Role.ADMIN);
  }
}
