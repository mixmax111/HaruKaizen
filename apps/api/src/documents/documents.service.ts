import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { extractText } from 'unpdf';
import { DocumentCategory } from '@harukaizen/shared';
import type { UploadedFileDto } from '../media/dto/uploaded-file.interface.js';
import type { UploadDocumentDto } from './dto/upload-document.dto.js';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async uploadDocument(
    userId: string,
    file: UploadedFileDto,
    dto: UploadDocumentDto,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Nessun file fornito per il caricamento.');
    }

    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    const isMarkdown =
      file.mimetype === 'text/markdown' ||
      file.originalname.toLowerCase().endsWith('.md');
    const isPlainText =
      file.mimetype === 'text/plain' ||
      file.originalname.toLowerCase().endsWith('.txt');

    if (!isPdf && !isMarkdown && !isPlainText) {
      throw new BadRequestException(
        'Formato file non supportato. Sono ammessi esclusivamente documenti .pdf, .md e .txt',
      );
    }

    let extractedText = '';

    if (isPdf) {
      try {
        const { text } = await extractText(new Uint8Array(file.buffer));
        extractedText = Array.isArray(text) ? text.join('\n\n') : String(text || '');
      } catch (err: any) {
        this.logger.error(`Fallita estrazione testo da PDF: ${err.message}`, err.stack);
        throw new BadRequestException(
          `Impossibile estrarre il testo dal documento PDF: ${err.message}`,
        );
      }
    } else {
      extractedText = file.buffer.toString('utf-8');
    }

    // Sanificazione caratteri e spaziatura eccessiva
    const sanitizedMarkdown = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!sanitizedMarkdown) {
      throw new BadRequestException(
        'Il documento caricato non contiene testo estraibile o è completamente vuoto.',
      );
    }

    const tokenEstimate = Math.ceil(sanitizedMarkdown.length / 4);
    const title = dto.title?.trim() || file.originalname;
    const category = dto.category || DocumentCategory.OTHER;

    const document = await this.prisma.userDocument.create({
      data: {
        userId,
        title,
        category,
        originalFilename: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        extractedMarkdown: sanitizedMarkdown,
        tokenEstimate,
        isActiveInRag: true,
      },
    });

    this.logger.log(
      `Documento "${title}" caricato con successo per utente ${userId} (~${tokenEstimate} token stimati).`,
    );

    return {
      id: document.id,
      title: document.title,
      category: document.category,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      tokenEstimate: document.tokenEstimate,
      isActiveInRag: document.isActiveInRag,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async findAllForUser(userId: string) {
    return this.prisma.userDocument.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        category: true,
        originalFilename: true,
        mimeType: true,
        tokenEstimate: true,
        isActiveInRag: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const doc = await this.prisma.userDocument.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!doc) {
      throw new NotFoundException(`Documento con ID ${id} non trovato.`);
    }

    return doc;
  }

  async toggleRag(userId: string, id: string) {
    const existing = await this.findOneForUser(userId, id);

    const updated = await this.prisma.userDocument.update({
      where: { id: existing.id },
      data: {
        isActiveInRag: !existing.isActiveInRag,
      },
      select: {
        id: true,
        title: true,
        category: true,
        tokenEstimate: true,
        isActiveInRag: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOneForUser(userId, id);

    await this.prisma.userDocument.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: `Documento "${existing.title}" eliminato con successo.`,
      id: existing.id,
    };
  }

  async getActiveRagDocuments(userId: string) {
    return this.prisma.userDocument.findMany({
      where: {
        userId,
        isActiveInRag: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        category: true,
        originalFilename: true,
        extractedMarkdown: true,
        tokenEstimate: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

