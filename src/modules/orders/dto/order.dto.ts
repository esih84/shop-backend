import { IsOptional, IsInt, Min, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  // کد تخفیف روی خود سبد ذخیره می‌شود (POST /coupons/apply)؛ اینجا لازم نیست.
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) pointsToRedeem?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
}
