import { IsOptional, IsString, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) pointsToRedeem?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
}
