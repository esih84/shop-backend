import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
} from './auth.cookies';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Verify OTP and set httpOnly auth cookies' })
  @ApiResponse({ status: 200, description: 'Sets auth cookies, returns user' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user, isNewUser } =
      await this.authService.verifyOtp(dto);
    setAuthCookies(res, { accessToken, refreshToken });
    return { user, isNewUser };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh auth cookies using the refresh cookie' })
  @ApiResponse({ status: 200, description: 'Rotates auth cookies' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh token not found');
    const tokens = await this.authService.refreshToken(token);
    setAuthCookies(res, tokens);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear auth cookies' })
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { success: true };
  }
}
