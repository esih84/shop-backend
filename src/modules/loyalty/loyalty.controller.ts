import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyTierDto } from './dto/loyalty.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('tiers')
  @Public()
  findTiers() {
    return this.loyaltyService.findAllTiers();
  }

  @Post('tiers')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  createTier(@Body() dto: CreateLoyaltyTierDto) {
    return this.loyaltyService.createTier(dto);
  }

  @Put('tiers/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  updateTier(@Param('id') id: string, @Body() dto: Partial<CreateLoyaltyTierDto>) {
    return this.loyaltyService.updateTier(id, dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  getMyLoyalty(@CurrentUser() user: User) {
    return this.loyaltyService.getUserLoyalty(user.id);
  }

  @Get('me/transactions')
  @ApiBearerAuth('access-token')
  getTransactions(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.loyaltyService.getTransactionHistory(user.id, page, limit);
  }
}
