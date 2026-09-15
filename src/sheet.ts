// Reading the workbook. Photo logs bury the header row under a legend block,
// so the header row is found rather than assumed.
import * as XLSX from 'xlsx';
import { autoMap, clean } from './credits.ts';

export type Cell = string | number | null;

export type Book = { name: string; sheetNames: string[]; sheets: Record<string, Cell[][]> };

const HEADER_SEARCH_DEPTH = 40;

export async function readWorkbook(file: File): Promise<Book> {
  const wb = XLSX.read(await file.arrayBuffer(), { dense: true, cellDates: false });
  const sheets: Record<string, Cell[][]> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    sheets[name] = XLSX.utils.sheet_to_json<Cell[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
  }
  return { name: file.name, sheetNames: Object.keys(sheets), sheets };
}

/** The row that reads most like a header: the one autoMap can do most with. */
export function findHeaderRow(rows: Cell[][]): number {
  let best = 0;
  let bestScore = -1;
  const depth = Math.min(rows.length, HEADER_SEARCH_DEPTH);
  for (let i = 0; i < depth; i++) {
    const headers = headerLabels(rows[i] ?? []);
    const filled = headers.filter(Boolean).length;
    if (filled < 3) continue;
    const roles = Object.values(autoMap(headers)).filter((v) => v !== null).length;
    // Roles dominate; column count breaks ties towards the widest row.
    const score = roles * 10 + Math.min(filled, 40) / 40;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function headerLabels(row: Cell[]): string[] {
  return row.map((c) => clean(c));
}

/** The widest row decides how many columns the sheet really has. */
export function columnCount(rows: Cell[][], headerRow: number): number {
  let n = 0;
  for (let i = headerRow; i < rows.length; i++) n = Math.max(n, rows[i]?.length ?? 0);
  return n;
}

/** Up to `limit` distinct non-empty values from a column, for the mapping slots. */
export function samples(rows: Cell[][], headerRow: number, column: number, limit = 3): string[] {
  const seen: string[] = [];
  for (let i = headerRow + 1; i < rows.length && seen.length < limit; i++) {
    const v = clean(rows[i]?.[column]);
    if (v && !seen.includes(v)) seen.push(v);
  }
  return seen;
}
