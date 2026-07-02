import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

import { nanoid } from "nanoid";
import { Otp } from "./entities/otp.entity";
import { User } from "../users/entities/user.entity";
import { SendOtpDto, VerifyOtpDto } from "./dto/auth.dto";
import { SmsService } from "../sms/sms.service";
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const { phone } = dto;

    // Check for recent OTPs to prevent spam
    const recentOtp = await this.otpRepository.findOne({
      where: { phone, verified: false },
      order: { createdAt: "DESC" },
    });

    if (recentOtp) {
      const cooldownMs = 60 * 1000; // 1 minute cooldown
      if (Date.now() - recentOtp.createdAt.getTime() < cooldownMs) {
        throw new HttpException(
          "Please wait before requesting another OTP",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Invalidate old OTPs
    await this.otpRepository.update(
      { phone, verified: false },
      { verified: true },
    );

    const otpLength = this.configService.get<number>("app.otpLength", 5);
    const code = Math.floor(Math.random() * Math.pow(10, otpLength))
      .toString()
      .padStart(otpLength, "0");

    const expiryMinutes = this.configService.get<number>(
      "app.otpExpiryMinutes",
      5,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({ phone, code, expiresAt }),
    );

    // ارسال کد از طریق سرویس Lookup کاوه‌نگار. اگر تنظیمات پیامک کامل نباشد،
    // SmsService فقط لاگ می‌کند و خطا نمی‌دهد (مناسب محیط توسعه).
    await this.smsService.sendOtp(phone, code);

    // در حالت توسعه برای راحتی تست، کد را در کنسول هم چاپ می‌کنیم.
    if (this.configService.get("app.nodeEnv") !== "production") {
      console.log(`OTP for ${phone}: ${code}`);
    }

    return { message: "OTP sent successfully" };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: User;
    isNewUser: boolean;
  }> {
    const { phone, code } = dto;

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false },
      order: { createdAt: "DESC" },
    });

    if (!otp) throw new UnauthorizedException("OTP not found or already used");
    if (otp.expiresAt < new Date())
      throw new UnauthorizedException("OTP expired");

    const maxAttempts = this.configService.get<number>("app.otpMaxAttempts", 5);
    if (otp.attempts >= maxAttempts) {
      await this.otpRepository.update(otp.id, { verified: true });
      throw new HttpException(
        "Too many attempts. Request a new OTP",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (otp.code !== code) {
      await this.otpRepository.update(otp.id, { attempts: otp.attempts + 1 });
      throw new UnauthorizedException("Invalid OTP code");
    }

    await this.otpRepository.update(otp.id, { verified: true });

    // Find or create user
    let user = await this.userRepository.findOne({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      const referralCode = nanoid(8).toUpperCase();
      user = await this.userRepository.save(
        this.userRepository.create({ phone, referralCode }),
      );
    }

    const tokens = this.generateTokens(user);
    return { ...tokens, user, isNewUser };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("jwt.refreshSecret"),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) throw new UnauthorizedException("User not found");
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = { sub: user.id, phone: user.phone, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("jwt.secret"),
      // Cast to any here to satisfy the strict StringValue type
      expiresIn:
        (this.configService.get<string>("jwt.expiresIn") as any) || "1h",
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("jwt.refreshSecret"),
      // Cast to any here as well
      expiresIn:
        (this.configService.get<string>("jwt.refreshExpiresIn") as any) || "7d",
    });

    return { accessToken, refreshToken };
  }
}
