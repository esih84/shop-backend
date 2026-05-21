import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles, Role } from '../../common/decorators/roles.decorator';

class SalesQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('top-products')
  getTopProducts(@Query('limit') limit = 10) {
    return this.analyticsService.getTopProducts(limit);
  }

  @Get('sales')
  getSalesSummary(@Query() query: SalesQueryDto) {
    const from = query.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ?? new Date();
    return this.analyticsService.getSalesSummary(from, to);
  }
}
