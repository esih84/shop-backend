import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoyaltyTierDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsInt() @Min(0) minPoints: number;
  @ApiProperty() @IsNumber() minSpent: number;
  @ApiProperty() @IsNumber() discountPercentage: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() freeShippingThreshold?: number;
  @ApiPropertyOptional() @IsOptional() benefits?: Record<string, unknown>;
}
