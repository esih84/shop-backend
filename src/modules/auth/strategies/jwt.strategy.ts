import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { ACCESS_TOKEN_COOKIE } from '../auth.cookies';

interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
}

/** توکن را اول از کوکی httpOnly و در صورت نبود از هدر Bearer می‌خواند. */
const extractJwt = ExtractJwt.fromExtractors([
  (req: Request) => req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null,
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: extractJwt,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret', 'secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) throw new UnauthorizedException('User not found or inactive');
    return user;
  }
}
