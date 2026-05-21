import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty() @IsUUID() variantId: string;
  @ApiProperty({ default: 1 }) @IsInt() @Min(1) quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty() @IsInt() @Min(1) quantity: number;
}
