import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsString() excerpt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() featuredImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
