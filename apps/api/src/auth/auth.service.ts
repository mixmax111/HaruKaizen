import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL  = '15m';
const REFRESH_TOKEN_TTL = '7d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly jwt:     JwtService,
    private readonly config:  ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email già in uso.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email:        dto.email,
        passwordHash,
        authProvider: 'local',
        userSettings: { create: {} },
      },
    });

    return this.generateTokens({ sub: user.id, email: user.email, role: user.role });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenziali non valide.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenziali non valide.');
    }

    return this.generateTokens({ sub: user.id, email: user.email, role: user.role });
  }

  async refreshTokens(payload: JwtPayload): Promise<Pick<AuthTokens, 'accessToken'>> {
    const accessToken = await this.jwt.signAsync(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret:    this.config.getOrThrow('JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );
    return { accessToken };
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret:    this.config.getOrThrow('JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      this.jwt.signAsync(payload, {
        secret:    this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
