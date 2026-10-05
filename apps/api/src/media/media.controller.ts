import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Res,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MediaService } from './media.service.js';
import { UploadProgressMediaDto } from './dto/upload-progress-media.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';
import type { UploadedFileDto } from './dto/uploaded-file.interface.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('progress/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadProgressPhoto(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp|mp4)$/,
        })
        .addMaxSizeValidator({
          maxSize: 15 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileDto,
    @Body() dto: UploadProgressMediaDto,
  ) {
    return this.mediaService.uploadProgressPhoto(user.sub, file, dto);
  }

  @Get('progress/latest')
  getLatestForGhosting(@CurrentUser() user: JwtPayload) {
    return this.mediaService.findLatestPhoto(user.sub);
  }

  @Get('progress')
  getAllProgressMedia(@CurrentUser() user: JwtPayload) {
    return this.mediaService.findAll(user.sub);
  }

  @Get('file/:id')
  async getMediaFile(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { stream, filename, mediaType } = await this.mediaService.getFileStream(user.sub, id);
    res.setHeader('Content-Type', mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mediaService.remove(user.sub, id);
  }
}
