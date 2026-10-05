import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UploadedFileDto } from '../dto/uploaded-file.interface.js';

export interface SavedFileResult {
  storedFilename: string;
  absolutePath: string;
}

@Injectable()
export class DiskStorageService {
  private readonly logger = new Logger(DiskStorageService.name);
  private readonly uploadDirectory: string;

  constructor() {
    this.uploadDirectory = path.resolve(process.cwd(), 'uploads', 'progress');
    if (!fs.existsSync(this.uploadDirectory)) {
      fs.mkdirSync(this.uploadDirectory, { recursive: true });
    }
  }

  async saveFile(file: UploadedFileDto): Promise<SavedFileResult> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const storedFilename = `${randomUUID()}${ext}`;
    const destinationPath = path.join(this.uploadDirectory, storedFilename);

    await fs.promises.writeFile(destinationPath, file.buffer);
    this.logger.log(`File salvato in locale con successo: ${storedFilename}`);

    return {
      storedFilename,
      absolutePath: destinationPath,
    };
  }

  getFilePath(storedFilename: string): string {
    return path.join(this.uploadDirectory, storedFilename);
  }

  async deleteFile(storedFilename: string): Promise<void> {
    const filePath = this.getFilePath(storedFilename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      this.logger.log(`File eliminato: ${storedFilename}`);
    }
  }
}
