import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async findByUserId(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) throw new NotFoundException('Impostazioni non trovate.');

    const { llmApiKey, ...safeSettings } = settings;
    return {
      ...safeSettings,
      hasApiKey: Boolean(llmApiKey),
    };
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    const { llmApiKey, ...otherFields } = dto;
    const data: Record<string, unknown> = { ...otherFields };

    if (llmApiKey !== undefined) {
      data['llmApiKey'] = llmApiKey ? this.crypto.encrypt(llmApiKey) : null;
    }

    const updated = await this.prisma.userSettings.update({
      where: { userId },
      data,
    });

    const { llmApiKey: _key, ...safeUpdated } = updated;
    return {
      ...safeUpdated,
      hasApiKey: Boolean(updated.llmApiKey),
    };
  }

  async getDecryptedApiKey(userId: string): Promise<string | null> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { llmApiKey: true },
    });

    if (!settings?.llmApiKey) return null;
    return this.crypto.decrypt(settings.llmApiKey);
  }
}

