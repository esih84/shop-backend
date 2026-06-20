import {
  IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsArray,
  ValidateNested, Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * در حالت multipart/form-data (آپلود همزمان تصاویر)، آرایه‌ها به‌صورت
 * رشته‌ی JSON ارسال می‌شوند. این تابع آن‌ها را به آبجکت تبدیل می‌کند تا
 * اعتبارسنجی nested درست کار کند. در حالت application/json بدون تغییر می‌ماند.
 */
const parseJsonArray = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? JSON.parse(value) : value;

/** تبدیل رشته‌های فرم به boolean برای حالت multipart */
const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' || value === true ? true : value === 'false' || value === false ? false : value;

const toNumber = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value !== '' ? Number(value) : value;

export class CreateAttributeDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() value: string;
}

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional({ description: 'در صورت خالی بودن از روی name ساخته می‌شود' })
  @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @Transform(toNumber) @IsNumber() @Min(0) basePrice: number;
  @ApiPropertyOptional({ description: 'موجودی انبار' })
  @IsOptional() @Transform(toNumber) @IsNumber() @Min(0) stock?: number;
  @ApiPropertyOptional({ description: 'کد محصول (اختیاری، یکتا)' })
  @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateAttributeDto], description: 'در حالت multipart به‌صورت رشته‌ی JSON ارسال شود' })
  @IsOptional()
  @Transform(parseJsonArray)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeDto)
  attributes?: CreateAttributeDto[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'تصاویر محصول — هنگام ساخت/ویرایش آپلود می‌شوند (اولین تصویر، تصویر اصلی)',
  })
  @IsOptional()
  images?: any;
}

export class FilterProductsDto {
  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه‌ی دسته' })
  @IsOptional() @IsUUID() categoryId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس slug دسته (شامل زیردسته‌ها)' })
  @IsOptional() @IsString() categorySlug?: string;

  @ApiPropertyOptional({ description: 'حداقل قیمت' })
  @IsOptional() @Transform(toNumber) @IsNumber() minPrice?: number;

  @ApiPropertyOptional({ description: 'حداکثر قیمت' })
  @IsOptional() @Transform(toNumber) @IsNumber() maxPrice?: number;

  @ApiPropertyOptional({ description: 'جست‌وجو در نام/توضیحات/کد محصول' })
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ description: 'فقط کالاهای موجود' })
  @IsOptional() @Transform(toBoolean) @IsBoolean() inStock?: boolean;

  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(toNumber) @IsNumber() limit?: number;

  @ApiPropertyOptional({ description: 'createdAt | basePrice | name', default: 'createdAt' })
  @IsOptional() @IsString() sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional() @IsString() sortOrder?: 'ASC' | 'DESC';
}
