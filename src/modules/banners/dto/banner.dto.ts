import { IsString, IsOptional, IsBoolean, IsInt, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBannerDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() imageUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobileImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() link?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}
