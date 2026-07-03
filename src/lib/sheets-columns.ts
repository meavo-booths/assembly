/**
 * Canonical mapping of Assembly fields to Google Sheet columns (A–S).
 * Indices are 0-based. Column N (13) is intentionally unmapped and left
 * untouched by the app.
 */
export const ASSEMBLY_SHEET_COLUMNS = {
  date: 0, // A
  deal: 1, // B
  market: 2, // C
  client: 3, // D
  clientType: 4, // E — client type
  closure: 5, // F
  survey: 6, // G
  fulfilled: 7, // H
  deliveryCompany: 8, // I — delivery company
  installDoneBy: 9, // J
  issue: 10, // K
  status: 11, // L
  priority: 12, // M
  issueCategory: 14, // O — first of five issue-category columns
} as const;

export type AssemblyColumnKey = keyof typeof ASSEMBLY_SHEET_COLUMNS;

/** Maximum number of issue categories (sheet columns O–S). */
export const MAX_ISSUE_CATEGORIES = 5;

/** Column indices for the five issue-category columns O, P, Q, R, S. */
export const ISSUE_CATEGORY_COLUMN_INDICES = [14, 15, 16, 17, 18] as const;

/** Last mapped column index (S). Column N (13) is skipped. */
export const ASSEMBLY_SHEET_LAST_COLUMN_INDEX = 18;

/** Header aliases (normalized, lowercase) used to resolve columns by header. */
const HEADER_ALIASES: Record<AssemblyColumnKey, string[]> = {
  date: ["date", "assembly date"],
  deal: ["deal", "deal id", "deal name"],
  market: ["market", "country"],
  client: ["client", "client name"],
  clientType: ["client type", "type", "channel", "channel type"],
  closure: ["closure"],
  survey: ["survey"],
  fulfilled: ["fulfilled", "fulfilment", "fulfillment"],
  deliveryCompany: ["delivery company", "delivery", "delivery done by"],
  installDoneBy: ["install done by", "install", "installer", "install partner"],
  issue: ["issue"],
  status: ["status"],
  priority: ["priority"],
  issueCategory: ["issue category", "category"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Resolve column indices from the sheet's header row. Falls back to the fixed
 * `ASSEMBLY_SHEET_COLUMNS` index for any field whose header can't be matched,
 * so imports keep working even if a header is renamed.
 */
export function resolveAssemblyColumns(
  headerRow: unknown[] | undefined,
): Record<AssemblyColumnKey, number> {
  const resolved = { ...ASSEMBLY_SHEET_COLUMNS } as Record<AssemblyColumnKey, number>;
  if (!headerRow || headerRow.length === 0) return resolved;

  const normalized = headerRow.map(normalizeHeader);
  (Object.keys(HEADER_ALIASES) as AssemblyColumnKey[]).forEach((key) => {
    const aliases = HEADER_ALIASES[key];
    const index = normalized.findIndex((header) => header && aliases.includes(header));
    if (index >= 0) resolved[key] = index;
  });

  return resolved;
}

/** Convert a 0-based column index to its A1 letter (0 -> A, 26 -> AA). */
export function columnLetter(index: number): string {
  let n = index;
  let letter = "";
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function cellString(row: unknown[], index: number): string {
  return String(row[index] ?? "").trim();
}

/** Parse a `DD/MM/YYYY` (or `.`/`-` separated) sheet date into a UTC Date. */
export function parseSheetDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[/.-]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y) return null;
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(Date.UTC(year, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a Date as `DD/MM/YYYY` for writing back to the sheet. */
export function formatSheetDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/** Interpret a sheet checkbox / truthy cell as a boolean. */
export function parseSheetBoolean(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "x";
}

export function formatSheetBoolean(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}
