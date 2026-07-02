import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDate,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { BANNER_POSITIONS, type BannerPosition } from "../banner-position";

export class CreateBannerDto {
  @ApiProperty() @IsString() title: string;
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'در صورت آپلود فایل تصویر، نیازی به ارسال این فیلد نیست',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobileImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() link?: string;
  @ApiPropertyOptional({ enum: BANNER_POSITIONS })
  @IsOptional()
  @IsIn(BANNER_POSITIONS)
  position?: BannerPosition;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
