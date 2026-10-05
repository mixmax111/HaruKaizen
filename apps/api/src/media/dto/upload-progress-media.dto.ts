import { IsOptional, IsNumber, IsPositive, Max, Min, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadProgressMediaDto {
  /**
   * Sincronizzazione immediata con il peso corporeo (A3)
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(500)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(70)
  bodyFatPercentage?: number;

  /**
   * Timestamp della foto generato dal dispositivo client in modalità offline-first (A1).
   * Se non passato, viene utilizzato il momento attuale della ricezione del server.
   */
  @IsOptional()
  @IsDateString()
  clientCapturedAt?: string;

  /**
   * Identificativo locale univoco (UUID) generato dall'app mobile offline
   * per tracciare e confermare l'avvenuta sincronizzazione.
   */
  @IsOptional()
  @IsString()
  clientSyncId?: string;
}
