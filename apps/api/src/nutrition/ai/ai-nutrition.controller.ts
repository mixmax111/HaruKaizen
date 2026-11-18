import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AiNutritionService } from './ai-nutrition.service.js';

export class EstimateTextDto {
  description!: string;
}

@Controller('nutrition/ai')
@UseGuards(JwtAuthGuard)
export class AiNutritionController {
  constructor(private readonly aiNutritionService: AiNutritionService) {}

  @Post('estimate-text')
  async estimateText(@Request() req: any, @Body() dto: EstimateTextDto) {
    if (!dto.description) {
      throw new BadRequestException('Descrizione richiesta.');
    }
    return this.aiNutritionService.estimateFromText(req.user.id, dto.description);
  }

  @Post('estimate-image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async estimateImage(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body('prompt') prompt?: string
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Immagine richiesta.');
    }
    return this.aiNutritionService.estimateFromImage(req.user.id, file.buffer, prompt);
  }
}

