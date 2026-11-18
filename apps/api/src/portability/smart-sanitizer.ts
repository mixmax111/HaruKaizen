/**
 * HaruKaizen Smart Number & String Sanitizer
 * 
 * Provides robust conversion and parsing for user-submitted spreadsheets (CSV/XLSX),
 * handling edge cases such as range values ("8-10", "45-50-55 kg"), text notes ("Sbarra + 10kg"),
 * qualitative loads ("Leggero", "Corpo libero / 6", "4 piastre"), comma decimals ("12,5"),
 * and missing dates in prescriptive plan templates.
 */

export interface ParsedWeight {
  weightKg: number;
  loadNote?: string;
}

/**
 * Parses raw weight input, extracting a clean numeric float while preserving
 * qualitative or complex text descriptions in `loadNote`.
 * 
 * Examples:
 * - "80", 80, "80kg" -> { weightKg: 80 }
 * - "Leggero" -> { weightKg: 0, loadNote: "Leggero" }
 * - "Corpo Libero" -> { weightKg: 0, loadNote: "Corpo Libero" }
 * - "Corpo libero / 6" -> { weightKg: 6, loadNote: "Corpo libero / 6" }
 * - "4 piastre" -> { weightKg: 4, loadNote: "4 piastre" }
 * - "Barra + 5" -> { weightKg: 5, loadNote: "Barra + 5" }
 * - "Sbarra + 5-10" -> { weightKg: 5, loadNote: "Sbarra + 5-10" }
 * - "14-16" -> { weightKg: 14, loadNote: "14-16" }
 */
export function parseWeightWithNote(raw: unknown): ParsedWeight {
  if (raw === null || raw === undefined) {
    return { weightKg: 0 };
  }

  if (typeof raw === 'number') {
    return { weightKg: isNaN(raw) || raw < 0 ? 0 : raw };
  }

  const rawStr = String(raw).trim();
  if (rawStr === '' || rawStr === '-' || rawStr === '--') {
    return { weightKg: 0 };
  }

  // Pure numeric check: e.g. "80", "12.5", "12,5", "80kg", "80 kg", "12.5 kg"
  const cleanNumericMatch = rawStr.match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i);
  if (cleanNumericMatch) {
    const val = parseFloat(cleanNumericMatch[1].replace(',', '.'));
    return { weightKg: isNaN(val) || val < 0 ? 0 : val };
  }

  // Replace comma decimal with dot for regex extraction
  const normalized = rawStr.replace(',', '.');

  // Extract first valid float / integer (e.g. "corpo libero / 6" -> 6, "4 piastre" -> 4, "14-16" -> 14)
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    const weightKg = isNaN(val) || val < 0 ? 0 : val;
    return {
      weightKg,
      loadNote: rawStr,
    };
  }

  // No digits found (e.g. "Leggero", "Corpo Libero", "Elastico verde", "Nessun carico")
  return {
    weightKg: 0,
    loadNote: rawStr,
  };
}

/**
 * Parses a raw weight value to a valid non-negative float.
 */
export function parseWeightKg(raw: unknown): number {
  return parseWeightWithNote(raw).weightKg;
}

/**
 * Parses raw reps input into both a display string (for templates) and an integer (for execution logs).
 * - repsTarget preserves the raw string ("8-10", "12-15", "60s", "10", "AMRAP")
 * - repsCompleted extracts the first integer via regex (e.g. "8-10" -> 8, "60s" -> 60). If no digits, defaults to 10.
 */
export function parseReps(raw: unknown): { repsTarget: string; repsCompleted: number } {
  if (raw === null || raw === undefined) {
    return { repsTarget: '10', repsCompleted: 10 };
  }

  if (typeof raw === 'number') {
    const intVal = Math.max(1, Math.floor(raw));
    return { repsTarget: String(intVal), repsCompleted: intVal };
  }

  const str = String(raw).trim();
  if (str === '' || str === '-') {
    return { repsTarget: '10', repsCompleted: 10 };
  }

  // Extract first integer for numerical execution log (e.g. "60s" -> 60, "8-10" -> 8)
  const match = str.match(/(\d+)/);
  const repsCompleted = match ? parseInt(match[1], 10) : 10;

  return {
    repsTarget: str,
    repsCompleted: repsCompleted > 0 ? repsCompleted : 10,
  };
}

/**
 * Parses raw rest seconds into an integer.
 * - Strings like "120s - 180s", "90s", "120" -> extracts first integer (120 or 90)
 * - Empty or missing -> defaults to 90
 */
export function parseRestSeconds(raw: unknown): number {
  if (raw === null || raw === undefined) return 90;

  if (typeof raw === 'number') {
    return isNaN(raw) || raw <= 0 ? 90 : Math.floor(raw);
  }

  const str = String(raw).trim();
  if (str === '' || str === '-') return 90;

  const match = str.match(/(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    return val > 0 ? val : 90;
  }

  return 90;
}

/**
 * Parses raw RPE into a valid number or null.
 * Empty, dashes, or non-numeric strings return null.
 */
export function parseRPE(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === 'number') {
    return isNaN(raw) || raw <= 0 ? null : raw;
  }

  const str = String(raw).trim();
  if (str === '' || str === '-' || str === '--') return null;

  const normalized = str.replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) || val <= 0 ? null : val;
  }

  return null;
}

/**
 * Fallback date parser for workout sheets.
 * If Data/date column is missing or empty (standard for prescriptive workout plan templates),
 * defaults to the current ISO timestamp instead of failing validation.
 */
export function parseDateOrDefault(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return new Date().toISOString();
  }

  const str = String(raw).trim();
  if (str === '' || str === '-') {
    return new Date().toISOString();
  }

  // If Italian format DD/MM/YYYY
  const itMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (itMatch) {
    const day = parseInt(itMatch[1], 10);
    const month = parseInt(itMatch[2], 10) - 1;
    const year = parseInt(itMatch[3], 10);
    const utcTimestamp = Date.UTC(year, month, day);
    if (!isNaN(utcTimestamp)) {
      return new Date(utcTimestamp).toISOString();
    }
  }

  // Check if string is already a valid date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}
