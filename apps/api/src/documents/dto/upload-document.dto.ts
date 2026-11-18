import { IsOptional, IsString, IsEnum } from 'class-validator';
import { DocumentCategory } from '@harukaizen/shared';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}

