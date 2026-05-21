import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+989123456789' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+989123456789' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
