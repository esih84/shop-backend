import { IsString, Matches, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendOtpDto {
  @ApiProperty({ example: "09123456789" })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: "شماره موبایل وارد شده معتبر نیست. نمونه: 09123456789",
  })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: "09123456789" })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: "شماره موبایل وارد شده معتبر نیست. نمونه: 09123456789",
  })
  phone: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(5, 5)
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
