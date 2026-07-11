import { ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';

/**
 * Pipe اعتبارسنجی فایل اکسل برای ورود گروهی محصولات.
 * فقط xlsx/xls (و در صورت نیاز csv) و حداکثر ۵ مگابایت. فایل الزامی است.
 */
export const excelFileValidationPipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType:
      /(spreadsheetml\.sheet|vnd\.ms-excel|application\/octet-stream|text\/csv)$/,
  })
  .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
  .build({
    fileIsRequired: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
