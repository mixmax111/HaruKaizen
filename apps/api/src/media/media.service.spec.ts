import { describe, it, expect, vi } from 'vitest';
import { MediaService } from './media.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiskStorageService } from './storage/disk-storage.service.js';
import { UploadedFileDto } from './dto/uploaded-file.interface.js';

describe('MediaService', () => {
  let service: MediaService;
  let mockPrisma: any;
  let mockStorage: any;

  beforeEach(() => {
    mockStorage = {
      saveFile: vi.fn().mockResolvedValue({
        storedFilename: 'test-uuid-photo.jpg',
        absolutePath: '/uploads/progress/test-uuid-photo.jpg',
      }),
      getFilePath: vi.fn().mockReturnValue('/uploads/progress/test-uuid-photo.jpg'),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
      progressMedia: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      measurement: {
        create: vi.fn(),
      },
    };

    service = new MediaService(mockPrisma as unknown as PrismaService, mockStorage as unknown as DiskStorageService);
  });

  it('should upload progress photo and synchronize weight measurement', async () => {
    const fakeFile: UploadedFileDto = {
      fieldname: 'file',
      originalname: 'front-pose.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image-content'),
    };

    mockPrisma.progressMedia.create.mockResolvedValueOnce({
      id: 'media-1',
      userId: 'user-1',
      mediaUrl: 'test-uuid-photo.jpg',
      mediaType: 'image',
    });

    mockPrisma.measurement.create.mockResolvedValueOnce({
      id: 'meas-1',
      userId: 'user-1',
      weightKg: 78.5,
      bodyFatPercentage: 14.2,
    });

    const result = await service.uploadProgressPhoto('user-1', fakeFile, {
      weightKg: 78.5,
      bodyFatPercentage: 14.2,
      clientSyncId: 'offline-sync-123',
    });

    expect(mockStorage.saveFile).toHaveBeenCalledWith(fakeFile);
    expect(mockPrisma.progressMedia.create).toHaveBeenCalled();
    expect(mockPrisma.measurement.create).toHaveBeenCalled();
    expect(result.clientSyncId).toBe('offline-sync-123');
    expect(result.measurement?.weightKg).toBe(78.5);
  });

  it('should retrieve latest photo for Ghosting Camera', async () => {
    mockPrisma.progressMedia.findFirst.mockResolvedValueOnce({
      id: 'latest-media',
      mediaUrl: 'latest.jpg',
      mediaType: 'image',
    });

    const latest = await service.findLatestPhoto('user-1');
    expect(latest?.id).toBe('latest-media');
  });
});
