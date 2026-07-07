import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ApplyCouponDto } from './dto/coupon.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('apply')
  apply(@CurrentUser() user: User, @Body() dto: ApplyCouponDto) {
    return this.couponsService.applyForUser(user.id, dto.code);
  }

  @Delete('apply')
  removeApplied(@CurrentUser() user: User) {
    return this.couponsService.removeCoupon(user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.couponsService.findAll(page, limit);
  }

  @Get('usages')
  @Roles(Role.ADMIN)
  findUsages(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('couponId') couponId?: string,
  ) {
    return this.couponsService.findUsages(page, limit, couponId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
