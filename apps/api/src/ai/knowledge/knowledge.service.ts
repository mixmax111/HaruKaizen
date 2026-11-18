import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private hypertrophyGuidelines: string = '';
  private nutritionTdeeRules: string = '';
  private bloodworkSafety: string = '';
  private combinedKnowledge: string = '';

  async onModuleInit() {
    await this.loadStaticKnowledge();
  }

  async loadStaticKnowledge(): Promise<void> {
    try {
      // Risoluzione directory knowledge compatibile sia con esecuzione da TypeScript sia da dist/ compilato
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      
      // Prova il path locale o di fallback rispetto alla root apps/api
      const possibleDirs = [
        currentDir,
        path.resolve(process.cwd(), 'apps/api/src/ai/knowledge'),
        path.resolve(process.cwd(), 'src/ai/knowledge'),
      ];

      let resolvedDir = currentDir;
      for (const dir of possibleDirs) {
        try {
          await fs.access(path.join(dir, 'hypertrophy-guidelines.md'));
          resolvedDir = dir;
          break;
        } catch {
          // continua a cercare
        }
      }

      const [hypertrophy, nutrition, bloodwork] = await Promise.all([
        fs.readFile(path.join(resolvedDir, 'hypertrophy-guidelines.md'), 'utf-8').catch(() => ''),
        fs.readFile(path.join(resolvedDir, 'nutrition-tdee-rules.md'), 'utf-8').catch(() => ''),
        fs.readFile(path.join(resolvedDir, 'bloodwork-safety.md'), 'utf-8').catch(() => ''),
      ]);

      this.hypertrophyGuidelines = hypertrophy.trim();
      this.nutritionTdeeRules = nutrition.trim();
      this.bloodworkSafety = bloodwork.trim();

      this.combinedKnowledge = [
        '### STATIC CLINICAL & HYPERTROPHY GUIDELINES (SOURCE OF TRUTH)',
        '--- HYPERTROPHY VOLUME LANDMARKS & PROGRESSION ---',
        this.hypertrophyGuidelines,
        '--- NUTRITION & TDEE SCIENTIFIC PARAMETERS ---',
        this.nutritionTdeeRules,
        '--- CLINICAL BLOODWORK SAFETY & RED-FLAG BIOMARKERS ---',
        this.bloodworkSafety,
      ].join('\n\n');

      this.logger.log(`KnowledgeService inizializzato con successo (${this.combinedKnowledge.length} caratteri caricati in RAM).`);
    } catch (err: any) {
      this.logger.error(`Impossibile caricare i file di knowledge statico: ${err.message}`, err.stack);
    }
  }

  getCombinedKnowledge(): string {
    return this.combinedKnowledge;
  }

  getHypertrophyGuidelines(): string {
    return this.hypertrophyGuidelines;
  }

  getNutritionTdeeRules(): string {
    return this.nutritionTdeeRules;
  }

  getBloodworkSafety(): string {
    return this.bloodworkSafety;
  }
}

