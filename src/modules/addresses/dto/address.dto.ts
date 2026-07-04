import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'خانه' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'تهران' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'خیابان ولیعصر، کوچه‌ی دوم' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '۱۲' })
  @IsString()
  @IsNotEmpty()
  plaque: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
