import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsInt, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CouponType } from '../entities/coupon.entity';

export class CreateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: CouponType }) @IsEnum(CouponType) type: CouponType;
  @ApiProperty() @IsNumber() value: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minPurchase?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() usageLimit?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() perUserLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class ValidateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsNumber() cartTotal: number;
}
