import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PortabilityService } from './portability.service.js';
import { ImportCsvDto, ExportQueryDto, PortabilityTarget, DuplicateStrategy } from './dto/import-export.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';
import type { UploadedFileDto } from '../media/dto/uploaded-file.interface.js';

@Controller('portability')
export class PortabilityController {
  constructor(private readonly portabilityService: PortabilityService) {}

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ImportCsvDto,
    @UploadedFile() file?: UploadedFileDto,
  ) {
    let csvContent = dto.csvContent || '';
    let xlsxBuffer: Buffer | undefined = undefined;

    const originalName = file?.originalname || '';
    const isXlsx =
      Boolean(originalName.match(/\.xlsx?$/i)) ||
      file?.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file?.mimetype === 'application/vnd.ms-excel';

    // Se fornito tramite multipart file upload
    if (file && file.buffer) {
      if (isXlsx) {
        xlsxBuffer = file.buffer;
      } else {
        csvContent = file.buffer.toString('utf-8');
      }
    }

    const columnMapping = typeof dto.columnMapping === 'string'
      ? JSON.parse(dto.columnMapping)
      : dto.columnMapping;

    return this.portabilityService.importCsv(
      user.sub,
      dto.target,
      csvContent,
      columnMapping,
      dto.duplicateStrategy || DuplicateStrategy.SKIP,
      xlsxBuffer,
      originalName,
    );
  }

  @Get('export')
  async exportData(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.portabilityService.exportData(user.sub, query.target);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.content);
  }
}

