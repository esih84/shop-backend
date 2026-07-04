import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PetType } from '../entities/pet.entity';

export class CreatePetDto {
  @ApiProperty({ example: 'پوپک' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: PetType })
  @IsOptional()
  @IsEnum(PetType)
  type?: PetType;

  @ApiPropertyOptional({ example: 'پرشین' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ example: '2023-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

export class UpdatePetDto extends PartialType(CreatePetDto) {}
