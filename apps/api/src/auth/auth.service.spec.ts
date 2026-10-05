import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService (Unit & Security Spec)', () => {
  let authService: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mocked.jwt.token'),
    signAsync: vi.fn().mockResolvedValue('mocked.jwt.token'),
  };

  const mockConfigService = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test_jwt_secret_at_least_32_characters_long';
      if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret_at_least_32_chars';
      return '';
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(
      mockPrismaService as any,
      mockJwtService as any,
      mockConfigService as any,
    );
  });

  describe('login', () => {
    it('dovrebbe generare accessToken e refreshToken per credenziali valide', async () => {
      const plainPassword = 'PasswordSicura123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'atleta@harukaizen.dev',
        passwordHash: hashedPassword,
        role: 'USER',
      });

      const tokens = await authService.login({
        email: 'atleta@harukaizen.dev',
        password: plainPassword,
      });

      expect(tokens).toHaveProperty('accessToken', 'mocked.jwt.token');
      expect(tokens).toHaveProperty('refreshToken', 'mocked.jwt.token');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('dovrebbe sollevare UnauthorizedException per password errata', async () => {
      const hashedPassword = await bcrypt.hash('PasswordCorretta123!', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'atleta@harukaizen.dev',
        passwordHash: hashedPassword,
        role: 'USER',
      });

      await expect(
        authService.login({
          email: 'atleta@harukaizen.dev',
          password: 'PasswordSbagliata999!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('dovrebbe sollevare UnauthorizedException se l’utente non esiste', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'inesistente@harukaizen.dev',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('dovrebbe sollevare ConflictException se l’email è già registrata', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-existing',
        email: 'giausata@harukaizen.dev',
      });

      await expect(
        authService.register({
          email: 'giausata@harukaizen.dev',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
