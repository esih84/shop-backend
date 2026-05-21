import {
  IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsArray,
  ValidateNested, Min, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../entities/discount.entity';

export class CreateVariantDto {
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiProperty() @IsNumber() @Min(0) stock: number;
  @ApiProperty() @IsString() sku: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateAttributeDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() value: string;
}

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(0) basePrice: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  @ApiPropertyOptional({ type: [CreateAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeDto)
  attributes?: CreateAttributeDto[];
}

export class FilterProductsDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: 'ASC' | 'DESC';
}
