import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: string[][];
}

/**
 * Legge un buffer Excel (.xlsx o .xls) e restituisce la matrice di righe del primo foglio di lavoro.
 */
export function parseXlsxBuffer(buffer: Buffer): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    return { headers: [], rows: [] };
  }

  // Estrae come matrice bidimensionale di stringhe
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = (rawData[0] || [])
    .map((h) => String(h ?? '').trim())
    .filter((h) => h.length > 0);

  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows = rawData
    .slice(1)
    .map((row) =>
      headers.map((_, colIdx) => {
        const val = row[colIdx];
        if (val === null || val === undefined) return '';
        const s = String(val).trim();
        return s === 'NaN' || s === 'null' || s === 'undefined' ? '' : s;
      }),
    )
    .filter((row) => row.some((cell) => cell.length > 0));

  return { headers, rows };
}
