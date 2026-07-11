import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { toNumber } from '../../../common/transforms';
import { SEGMENTS } from '../rfm';

/**
 * فیلتر مشتریان بر اساس فیلدهای RFM. هم برای لیست مشتریان داشبورد و هم برای
 * هدف‌گیری گیرنده‌های کمپین تبلیغاتی استفاده می‌شود.
 */
export class CustomerFilterDto {
  @ApiPropertyOptional({ enum: SEGMENTS, description: 'برچسب سگمنت' })
  @IsOptional() @IsString() @IsIn(SEGMENTS as unknown as string[]) segment?: string;

  @ApiPropertyOptional({ description: 'حداقل مبلغ کل خرید' })
  @IsOptional() @Transform(toNumber) @IsNumber() minSpent?: number;

  @ApiPropertyOptional({ description: 'حداکثر مبلغ کل خرید' })
  @IsOptional() @Transform(toNumber) @IsNumber() maxSpent?: number;

  @ApiPropertyOptional({ description: 'حداقل تعداد سفارش' })
  @IsOptional() @Transform(toNumber) @IsNumber() minOrders?: number;

  @ApiPropertyOptional({ description: 'آخرین خرید در N روز اخیر' })
  @IsOptional() @Transform(toNumber) @IsNumber() lastPurchaseWithinDays?: number;

  @ApiPropertyOptional({ description: 'آخرین خرید قدیمی‌تر از N روز' })
  @IsOptional() @Transform(toNumber) @IsNumber() lastPurchaseOlderThanDays?: number;

  @ApiPropertyOptional({ description: 'نوع حیوان خانگی (dog/cat/bird/other)' })
  @IsOptional() @IsString() petType?: string;

  @ApiPropertyOptional({ description: 'جست‌وجو در نام/موبایل' })
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsNumber() limit?: number;
}
