import {
  IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsArray,
  ValidateNested, Min, IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  emptyToUndefined,
  toBoolean,
  toNumber,
} from '../../../common/transforms';

export class CreateAttributeDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() value: string;
}

/**
 * attributes را از رشته‌ی JSON (حالت multipart) یا آرایه (حالت JSON) به
 * نمونه‌های واقعی CreateAttributeDto تبدیل می‌کند. ساختن نمونه‌ی کلاس ضروری است
 * چون class-validator اعتبارسنجی nested را بر اساس constructor هر آیتم انجام
 * می‌دهد؛ آبجکت خام (بدون متادیتا) با whitelist خطای «key should not exist» می‌دهد.
 * ضمناً فقط key/value نگه داشته می‌شود تا فیلدهای اضافی (id/productId) رد شوند.
 */
function toAttributeInstances({ value }: { value: unknown }) {
  let arr: unknown = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    try {
      arr = JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => {
    const dto = new CreateAttributeDto();
    dto.key = (item as { key?: string })?.key as string;
    dto.value = (item as { value?: string })?.value as string;
    return dto;
  });
}

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ description: 'اسلاگ یکتا برای آدرس محصول' })
  @Transform(emptyToUndefined) @IsString() @IsNotEmpty() slug: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsString() description?: string;
  @ApiProperty() @Transform(toNumber) @IsNumber() @Min(0) basePrice: number;
  @ApiPropertyOptional({ description: 'موجودی انبار' })
  @IsOptional() @Transform(toNumber) @IsNumber() @Min(0) stock?: number;
  @ApiPropertyOptional({ description: 'کد محصول (اختیاری، یکتا)' })
  @IsOptional() @Transform(emptyToUndefined) @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToUndefined) @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateAttributeDto], description: 'در حالت multipart به‌صورت رشته‌ی JSON ارسال شود' })
  @IsOptional()
  @Transform(toAttributeInstances)
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

/**
 * برای ویرایش: همه‌ی فیلدها optional می‌شوند تا ارسال جزئی (partial) مجاز باشد.
 * هر فیلدی که فرستاده نشود، مقدار قبلی محصول حفظ می‌گردد (در سرویس).
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  // attributes به‌صورت صریح بازتعریف می‌شود چون PartialType دکوراتور
  // @Type(() => CreateAttributeDto) را برای nested به‌درستی منتقل نمی‌کند و
  // در نتیجه با whitelist/forbidNonWhitelisted خطای «key should not exist»
  // برای هر مشخصه رخ می‌دهد.
  @ApiPropertyOptional({
    type: [CreateAttributeDto],
    description: 'در حالت multipart به‌صورت رشته‌ی JSON ارسال شود',
  })
  @IsOptional()
  @Transform(toAttributeInstances)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeDto)
  attributes?: CreateAttributeDto[];
}

export class ReorderImagesDto {
  @ApiProperty({
    type: [String],
    description: 'شناسه‌ی تصاویر به ترتیب دلخواه (اولین تصویر، تصویر اصلی)',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  imageIds: string[];
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
