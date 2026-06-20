import { ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';

/**
 * Pipe اعتبارسنجی فایل تصویر برای آپلودهای داخل ماژول‌ها
 * (product / banner / category). فایل اختیاری است؛ اگر ارسال شود
 * باید تصویر و حداکثر ۱۰ مگابایت باشد.
 */
export const imageFileValidationPipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
  .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
  .build({
    fileIsRequired: false,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
