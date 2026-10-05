import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiskStorageService } from './storage/disk-storage.service.js';
import { UploadProgressMediaDto } from './dto/upload-progress-media.dto.js';
import { UploadedFileDto } from './dto/uploaded-file.interface.js';
import * as fs from 'node:fs';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DiskStorageService,
  ) {}

  async uploadProgressPhoto(
    userId: string,
    file: UploadedFileDto,
    dto: UploadProgressMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Nessun file multimediale caricato.');
    }

    const saved = await this.storage.saveFile(file);
    const capturedAt = dto.clientCapturedAt ? new Date(dto.clientCapturedAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const media = await tx.progressMedia.create({
        data: {
          userId,
          mediaUrl: saved.storedFilename,
          mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
          createdAt: capturedAt,
        },
      });

      let measurementRecord = null;
      if (dto.weightKg !== undefined) {
        measurementRecord = await tx.measurement.create({
          data: {
            userId,
            weightKg: dto.weightKg,
            bodyFatPercentage: dto.bodyFatPercentage,
            recordedAt: capturedAt,
          },
        });
      }

      return {
        media,
        measurement: measurementRecord,
        clientSyncId: dto.clientSyncId,
      };
    });
  }

  async findLatestPhoto(userId: string) {
    const latest = await this.prisma.progressMedia.findFirst({
      where: { userId, deletedAt: null, mediaType: 'image' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return null;
    }

    return latest;
  }

  async findAll(userId: string) {
    return this.prisma.progressMedia.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFileStream(userId: string, mediaId: string) {
    const media = await this.prisma.progressMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('File non trovato.');
    }

    if (media.userId !== userId) {
      throw new ForbiddenException('Non hai i permessi per visualizzare questo file.');
    }

    const filePath = this.storage.getFilePath(media.mediaUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File non presente sul server.');
    }

    return {
      stream: fs.createReadStream(filePath),
      filename: media.mediaUrl,
      mediaType: media.mediaType,
    };
  }

  async remove(userId: string, mediaId: string) {
    const media = await this.prisma.progressMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('File non trovato.');
    }

    if (media.userId !== userId) {
      throw new ForbiddenException('Non hai i permessi per eliminare questo file.');
    }

    await this.prisma.progressMedia.update({
      where: { id: mediaId },
      data: { deletedAt: new Date() },
    });

    await this.storage.deleteFile(media.mediaUrl);

    return { success: true };
  }
}
