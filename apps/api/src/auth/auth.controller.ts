import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { AltchaService } from './altcha.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const REFRESH_COOKIE_NAME    = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly altchaService: AltchaService,
  ) {}

  @Public()
  @Get('altcha-challenge')
  getAltchaChallenge() {
    return this.altchaService.generateChallenge();
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    if (process.env.NODE_ENV !== 'test' && !dto.altchaPayload) {
      throw new BadRequestException('Proof-of-Work crittografico (ALTCHA) obbligatorio.');
    }
    if (dto.altchaPayload) {
      this.altchaService.verifySolution(dto.altchaPayload);
    }

    const tokens = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    if (process.env.NODE_ENV !== 'test' && !dto.altchaPayload) {
      throw new BadRequestException('Proof-of-Work crittografico (ALTCHA) obbligatorio.');
    }
    if (dto.altchaPayload) {
      this.altchaService.verifySolution(dto.altchaPayload);
    }

    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: JwtPayload) {
    return this.authService.refreshTokens(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    return { message: 'Logout eseguito con successo.' };
  }

  private setRefreshCookie(res: Response, token: string): void {
    const isHttps =
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.NODE_ENV === 'production' &&
        Boolean(process.env.WEB_ORIGIN && !process.env.WEB_ORIGIN.startsWith('http://')));

    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure:   isHttps,
      sameSite: isHttps ? 'strict' : 'lax',
      maxAge:   REFRESH_COOKIE_MAX_AGE,
      path:     '/api/v1/auth',
    });
  }
}
