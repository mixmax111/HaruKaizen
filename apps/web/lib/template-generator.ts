/**
 * HaruKaizen Universal Data Portability - Standard CSV & XLSX Template Generator
 * 
 * Generates downloadable RFC-4180 compliant CSV templates with UTF-8 BOM (\uFEFF)
 * for seamless compatibility with Microsoft Excel, Apple Numbers, Google Sheets,
 * and LibreOffice Calc (preventing Italian accent corruption).
 */

export interface TemplateDefinition {
  filename: string;
  headers: string[];
  sampleRows: string[][];
  description: string;
  notes?: string[];
}

export const WORKOUT_TEMPLATE: TemplateDefinition = {
  filename: 'harukaizen_scheda_template.csv',
  headers: ['Giorno', 'Esercizio', 'Serie', 'Ripetizioni', 'Carico (Kg)', 'RPE', 'Recupero (s)'],
  sampleRows: [
    ['Push A', 'Panca Piana Bilanciere', '4', '8-10', '80', '8', '120'],
    ['Push A', 'Spinte Manubri Inclinata', '3', '10-12', '26', '8.5', '90'],
    ['Pull A', 'Lat Machine Presa Neutra', '4', '8-10', '55', '8', '120'],
  ],
  description: 'Template per schede di allenamento, routine settimanali e log esecuzioni.',
  notes: [
    'Compatibile con schemi serie classici o notazione compatta (es. "4x8" o "3x10-12")',
    'I carichi decimali possono essere espressi con punto o virgola (es. 26 o 26.5)',
    'RPE opzionale su scala Borg/RIR da 1 a 10',
  ],
};

export const NUTRITION_TEMPLATE: TemplateDefinition = {
  filename: 'harukaizen_nutrizione_template.csv',
  headers: ['Data', 'Pasto', 'Alimento', 'Quantita (g)', 'Calorie (kcal)', 'Proteine (g)', 'Carboidrati (g)', 'Grassi (g)'],
  sampleRows: [
    ['2026-10-21', 'COLAZIONE', "Fiocchi d'avena", '80', '298', '10.8', '47.0', '5.6'],
    ['2026-10-21', 'PRANZO', 'Petto di pollo', '200', '220', '46.0', '0.0', '2.4'],
    ['2026-10-21', 'CENA', 'Riso basmati', '100', '350', '7.5', '77.0', '0.8'],
  ],
  description: 'Template per diario alimentare quotidiano, pasti e suddivisione macro-nutrienti.',
  notes: [
    'Pasto accetta: COLAZIONE (Breakfast), PRANZO (Lunch), CENA (Dinner), SPUNTINO (Snack)',
    'Data in formato standard ISO YYYY-MM-DD (es. 2026-10-21)',
    'Macro espressi in grammi per porzione consumata',
  ],
};

export const MEASUREMENTS_TEMPLATE: TemplateDefinition = {
  filename: 'harukaizen_biometrie_template.csv',
  headers: ['Data', 'Peso (Kg)', 'Massa Grassa (%)', 'Vita (cm)', 'Torace (cm)', 'Braccio (cm)', 'Gamba (cm)'],
  sampleRows: [
    ['2026-10-21', '76.4', '14.2', '81.5', '104.0', '38.5', '58.0'],
    ['2026-10-14', '76.8', '14.5', '82.0', '103.5', '38.2', '58.0'],
  ],
  description: 'Template per tracciamento biometrico corporeo e circonferenze.',
  notes: [
    'Solo la Data e il Peso sono obbligatori; i restanti valori biometrici sono facoltativi',
  ],
};

/**
 * Trigger client-side browser download for a CSV string using UTF-8 BOM.
 */
export function downloadCsv(filename: string, content: string): void {
  if (typeof window === 'undefined') return;

  // \uFEFF triggers UTF-8 recognition in Excel for Windows/Mac
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Builds standard CSV content from headers and sample rows.
 */
function buildCsvString(headers: string[], rows: string[][]): string {
  const escapeCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Download Workout Plan standard CSV template (`harukaizen_scheda_template.csv`).
 */
export function downloadWorkoutTemplateCsv(): void {
  const csv = buildCsvString(WORKOUT_TEMPLATE.headers, WORKOUT_TEMPLATE.sampleRows);
  downloadCsv(WORKOUT_TEMPLATE.filename, csv);
}

/**
 * Download Nutrition Log standard CSV template (`harukaizen_nutrizione_template.csv`).
 */
export function downloadNutritionTemplateCsv(): void {
  const csv = buildCsvString(NUTRITION_TEMPLATE.headers, NUTRITION_TEMPLATE.sampleRows);
  downloadCsv(NUTRITION_TEMPLATE.filename, csv);
}

/**
 * Download Measurements standard CSV template (`harukaizen_biometrie_template.csv`).
 */
export function downloadMeasurementsTemplateCsv(): void {
  const csv = buildCsvString(MEASUREMENTS_TEMPLATE.headers, MEASUREMENTS_TEMPLATE.sampleRows);
  downloadCsv(MEASUREMENTS_TEMPLATE.filename, csv);
}

