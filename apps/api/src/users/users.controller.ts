import { Controller, Get, Patch, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Throttle } from '@nestjs/throttler';

export class PasswordConfirmationDto {
  confirmPassword?: string;
}

@Controller(['users', 'user'])
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findMe(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post('export-data')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  exportData(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PasswordConfirmationDto
  ) {
    return this.usersService.exportData(user.sub, dto.confirmPassword);
  }

  @Delete('account')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  deleteAccount(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PasswordConfirmationDto
  ) {
    return this.usersService.deleteAccount(user.sub, dto.confirmPassword);
  }
}
