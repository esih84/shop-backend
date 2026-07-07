import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDate,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CouponType, CouponScope } from '../entities/coupon.entity';

export class CreateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: CouponType }) @IsEnum(CouponType) type: CouponType;
  @ApiPropertyOptional({ enum: CouponScope, default: CouponScope.CART })
  @IsOptional()
  @IsEnum(CouponScope)
  scope?: CouponScope;
  @ApiProperty() @IsNumber() value: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minPurchase?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() usageLimit?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() perUserLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
  @ApiPropertyOptional({ type: [String], description: 'محصولات مشمول (وقتی scope=product)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
  @ApiPropertyOptional({ type: [String], description: 'دسته‌بندی‌های مشمول (وقتی scope=category)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

/** ورودی اعمال کوپن — فقط کد؛ مبلغ از سبد واقعی سرور خوانده می‌شود. */
export class ApplyCouponDto {
  @ApiProperty() @IsString() code: string;
}
