import { Injectable } from '@nestjs/common';
import { ContextSnapshot } from '../aggregator/context-snapshot.interface.js';
import { CoachTone } from '@harukaizen/shared';
import { KnowledgeService } from '../knowledge/knowledge.service.js';

export interface ClinicalPreCheckInput {
  sex?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetKcal?: number | null;
}

export interface ClinicalPreCheckResult {
  requiresClinicalWarning: boolean;
  warningReasons: string[];
  bmi?: number | null;
}

export interface UserDocumentSnippet {
  id: string;
  title: string;
  category: string;
  originalFilename: string;
  extractedMarkdown: string;
}

@Injectable()
export class PromptBuilderService {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * Valutazione deterministica TypeScript delle condizioni di guardia clinica prima dell'invocazione LLM.
   */
  evaluateClinicalGuardrails(input: ClinicalPreCheckInput): ClinicalPreCheckResult {
    const reasons: string[] = [];
    let requiresClinicalWarning = false;
    let bmi: number | null = null;

    if (input.heightCm && input.weightKg && input.heightCm > 0) {
      const heightM = input.heightCm / 100;
      bmi = Number((input.weightKg / (heightM * heightM)).toFixed(1));
      if (bmi < 18.5) {
        requiresClinicalWarning = true;
        reasons.push(
          `Indice di Massa Corporea (BMI = ${bmi}) sotto la soglia di sicurezza di 18.5 (sottopeso). Rischio clinico per protocolli restrittivi.`,
        );
      }
    }

    if (input.targetKcal !== undefined && input.targetKcal !== null) {
      if (input.sex === 'M' && input.targetKcal < 1500) {
        requiresClinicalWarning = true;
        reasons.push(
          `Target calorico (${input.targetKcal} kcal) inferiore al minimo clinico maschile di sicurezza (1500 kcal/die).`,
        );
      } else if (input.sex === 'F' && input.targetKcal < 1200) {
        requiresClinicalWarning = true;
        reasons.push(
          `Target calorico (${input.targetKcal} kcal) inferiore al minimo clinico femminile di sicurezza (1200 kcal/die).`,
        );
      }
    }

    return {
      requiresClinicalWarning,
      warningReasons: reasons,
      bmi,
    };
  }

  buildSystemPrompt(
    tone: string,
    options?: {
      userDocuments?: UserDocumentSnippet[];
      clinicalCheck?: ClinicalPreCheckResult;
      isPlanGeneration?: boolean;
    },
  ): string {
    let personaInstructions = '';

    switch (tone) {
      case CoachTone.RIGOROUS:
        personaInstructions = `
SEI IL COACH HARUKAIZEN IN MODALITÀ "RIGOROSO & SCIENTIFICO".
Tono: Analitico, scientifico, privo di fronzoli e severo.
Linee guida:
- Focalizzati sui numeri: deficit o surplus calorico calcolato, volume di allenamento in kg, progressive overload.
- Non accettare scuse per calorie o workout mancati.
- Fornisci raccomandazioni fisiologiche precise e categoriche.`;
        break;

      case CoachTone.EMPATHETIC:
        personaInstructions = `
SEI IL COACH HARUKAIZEN IN MODALITÀ "EMPATICO & MOTIVAZIONALE".
Tono: Caldo, supportivo, empatico e incoraggiante.
Linee guida:
- Celebra ogni progresso, anche piccolo.
- Focalizzati sulla costanza e sul benessere psicofisico e mentale.
- Rassicura l'utente di fronte a stalli di peso o momenti di difficoltà, ricordando che il percorso è una maratona.`;
        break;

      case CoachTone.KAIZEN:
      default:
        personaInstructions = `
SEI IL COACH HARUKAIZEN IN MODALITÀ "KAIZEN (MIGLIORAMENTO CONTINUO)".
Tono: Sereno, equilibrato, saggio e costruttivo.
Linee guida:
- Ispirati alla filosofia Kaizen: "Migliorare dell'1% ogni giorno".
- Valuta i dati in modo oggettivo e calmo.
- Trova l'equilibrio ideale tra disciplina scientifica e sostenibilità a lungo termine.`;
        break;
    }

    // 1. Iniezione linee guida scientifiche statiche (Semi-RAG source of truth)
    const staticKnowledge = this.knowledgeService.getCombinedKnowledge();

    // 2. Iniezione documenti caricati dall'utente (Analisi del sangue, referti medici, schede coach)
    let userDocumentsSection = 'Nessun documento utente attivo.';
    if (options?.userDocuments && options.userDocuments.length > 0) {
      let combinedDocs = '';
      for (const doc of options.userDocuments) {
        const docBlock = `--- DOCUMENTO: ${doc.title} [Categoria: ${doc.category}] (File: ${doc.originalFilename}) ---\n${doc.extractedMarkdown}\n\n`;
        if ((combinedDocs + docBlock).length > 30000) {
          combinedDocs += '\n[...ulteriori documenti troncati per limiti di contesto massimo 30.000 caratteri...]';
          break;
        }
        combinedDocs += docBlock;
      }
      userDocumentsSection = combinedDocs.trim();
    }

    // 3. Regole Cliniche, Anti-PED e Guardrails
    const clinicalWarningsText = options?.clinicalCheck?.requiresClinicalWarning
      ? `ATTENZIONE CLINICA PRE-CHECK ATTIVATA: ${options.clinicalCheck.warningReasons.join(' | ')}`
      : 'Nessun allarme critico dal pre-check deterministico iniziale.';

    return `
${personaInstructions}

═══════════════════════════════════════════════════════════════════
CONOSCENZA SCIENTIFICA DI SISTEMA (FONTE DI VERITÀ CLINICA):
═══════════════════════════════════════════════════════════════════
${staticKnowledge}

═══════════════════════════════════════════════════════════════════
DOCUMENTI MEDICI & SCHEDE UTENTE (SEMI-RAG CONTEXT):
═══════════════════════════════════════════════════════════════════
${userDocumentsSection}

═══════════════════════════════════════════════════════════════════
REGOLE CLINICHE ASSOLUTE E PROTOCOLLI DI SICUREZZA:
═══════════════════════════════════════════════════════════════════
1. DIVIETO SOSTANZE DOPANTI: È TASSATIVAMENTE VIETATO suggerire, consigliare o validare sostanze dopanti, steroidi anabolizzanti (AAS), SARM, clenbuterolo, ormoni tiroidei o farmaci anoressizzanti/dimagranti non autorizzati.
2. PRE-CHECK CLINICO:
   ${clinicalWarningsText}
3. SEGNALAZIONE CLINICA & WARNING: Se dai documenti medici (es. esami ematici) emergono marcatori fuori norma (es. transaminasi AST/ALT elevate, creatinina elevata, eGFR ridotta, iperglicemia a digiuno > 126 mg/dL, dislipidemia marcata) oppure se requiresClinicalWarning è attivo:
   - DEVI popolare il campo 'clinicalWarning' indicando chiaramente la necessità di consultare un medico specialista o nutrizionista abilitato.
   - Fornisci in ogni caso un piano di base prudente, conservativo e sicuro orientato al mantenimento e al recupero fisiologico.
`.trim();
  }

  buildUserPrompt(snapshot: ContextSnapshot): string {
    return `
Ecco il Context Snapshot completo dell'utente per l'intervallo temporale ${snapshot.timeframe.dateStart} - ${snapshot.timeframe.dateEnd}:

${JSON.stringify(snapshot, null, 2)}

Analizza questi dati ed elabora il tuo report di feedback settimanale Kaizen.
`.trim();
  }

  buildWorkoutPlanPrompt(params: {
    userGoal?: string;
    daysPerWeek?: number;
    equipmentAvailable?: string;
    snapshot?: ContextSnapshot;
  }): string {
    return `
Richiesta: Genera una scheda di allenamento ipertrofica personalizzata isolata in sandbox (AI_DRAFT).
Obiettivo Utente: ${params.userGoal || 'Ipertrofia muscolare e miglioramento composizione corporea'}
Frequenza settimanale: ${params.daysPerWeek || 4} giorni
Attrezzatura disponibile: ${params.equipmentAvailable || 'Palestra commerciale completa (bilancieri, manubri, cavi, macchinari)'}

Dati biometrici utente:
${JSON.stringify(params.snapshot || {}, null, 2)}

Genera il piano rispettando i volumi MAV/MEV, la progressione doppia e le linee guida scientifiche.
`.trim();
  }

  buildDietPlanPrompt(params: {
    userGoal?: string;
    targetKcal?: number;
    dietaryRestrictions?: string;
    snapshot?: ContextSnapshot;
  }): string {
    return `
Richiesta: Genera un piano nutrizionale giornaliero bilanciato isolato in sandbox (AI_DRAFT).
Obiettivo: ${params.userGoal || 'Deficit calorico sostenibile / Ricomposizione corporea'}
Target Calorico richiesto: ${params.targetKcal ? `${params.targetKcal} kcal` : 'Calcolato in base a TDEE'}
Restrizioni/Preferenze: ${params.dietaryRestrictions || 'Nessuna intolleranza specifica'}

Dati biometrici utente:
${JSON.stringify(params.snapshot || {}, null, 2)}

Genera alimenti e pasti dettagliati per il giorno tipo (colazione, pranzo, cena, snack).
`.trim();
  }
}
