import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  validate(@CurrentUser() user: User, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.couponsService.findAll(page, limit);
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
