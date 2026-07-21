import { getSheetsClient, getSpreadsheetId, ASSEMBLY_SHEET_TAB } from "@/lib/sheets-client";
import {
  ASSEMBLY_SHEET_COLUMNS,
  ASSEMBLY_SHEET_LAST_COLUMN_INDEX,
  ISSUE_CATEGORY_COLUMN_INDICES,
  columnLetter,
  formatSheetBoolean,
  formatSheetDate,
} from "@/lib/sheets-columns";
import {
  EMPTY_SHEET_DROPDOWN_OPTIONS,
  type SheetDropdownOptions,
} from "@/lib/assembly-schedule";

/** Sheet-mirrored fields written on create/edit (columns A–N + O–S). */
export type AssemblySheetFields = {
  assemblyDate: Date | null;
  dealId: string;
  market: string;
  clientName: string;
  channelType: string;
  closure: boolean;
  survey: boolean;
  fulfilledOn: Date | null;
  deliveryPartnerName: string;
  installPartnerName: string;
  issue: string;
  status: string;
  priority: string;
  comments: string;
  issueCategories: string[];
};

function buildRow(fields: AssemblySheetFields): string[] {
  const row = new Array<string>(ASSEMBLY_SHEET_LAST_COLUMN_INDEX + 1).fill("");
  const c = ASSEMBLY_SHEET_COLUMNS;
  row[c.date] = formatSheetDate(fields.assemblyDate);
  row[c.deal] = fields.dealId;
  row[c.market] = fields.market;
  row[c.client] = fields.clientName;
  row[c.clientType] = fields.channelType;
  row[c.closure] = formatSheetBoolean(fields.closure);
  row[c.survey] = formatSheetBoolean(fields.survey);
  row[c.fulfilled] = formatSheetDate(fields.fulfilledOn);
  row[c.deliveryCompany] = fields.deliveryPartnerName;
  row[c.installDoneBy] = fields.installPartnerName;
  row[c.issue] = fields.issue;
  row[c.status] = fields.status;
  row[c.priority] = fields.priority;
  row[c.comments] = fields.comments;
  // Issue categories spread across O–S; unused columns are cleared.
  ISSUE_CATEGORY_COLUMN_INDICES.forEach((columnIndex, i) => {
    row[columnIndex] = fields.issueCategories[i] ?? "";
  });
  return row;
}

/**
 * First 1-based sheet row whose Deal ID (column B) is empty.
 * Skips the header row. Prefers gaps left by formula-filled rows that
 * look empty but still block Sheets' values.append table-end detection.
 */
export async function findFirstEmptyDealRow(): Promise<number> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const dealLetter = columnLetter(ASSEMBLY_SHEET_COLUMNS.deal);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${ASSEMBLY_SHEET_TAB}'!${dealLetter}:${dealLetter}`,
  });

  const values = response.data.values ?? [];
  // Row 1 is the header — start looking from index 1 (sheet row 2).
  for (let i = 1; i < values.length; i += 1) {
    if (!String(values[i]?.[0] ?? "").trim()) return i + 1;
  }
  // Column B is empty after the last returned cell (or only a header exists).
  return Math.max(values.length + 1, 2);
}

/** Locate the 1-based sheet row for a deal ID by scanning column B. */
export async function findSheetRowByDealId(dealId: string): Promise<number | null> {
  const target = dealId.trim();
  if (!target) return null;

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const dealLetter = columnLetter(ASSEMBLY_SHEET_COLUMNS.deal);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${ASSEMBLY_SHEET_TAB}'!${dealLetter}:${dealLetter}`,
  });

  const values = response.data.values ?? [];
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i]?.[0] ?? "").trim() === target) return i + 1;
  }
  return null;
}

/**
 * Update the mapped columns of an existing sheet row (A–N and O–S).
 */
export async function updateAssemblyRow(
  rowNumber: number,
  fields: AssemblySheetFields,
): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const row = buildRow(fields);

  const commentsLetter = columnLetter(ASSEMBLY_SHEET_COLUMNS.comments); // N
  const firstCategoryLetter = columnLetter(ISSUE_CATEGORY_COLUMN_INDICES[0]); // O
  const lastCategoryLetter = columnLetter(
    ISSUE_CATEGORY_COLUMN_INDICES[ISSUE_CATEGORY_COLUMN_INDICES.length - 1],
  ); // S
  const firstCategoryIndex = ISSUE_CATEGORY_COLUMN_INDICES[0];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `'${ASSEMBLY_SHEET_TAB}'!A${rowNumber}:${commentsLetter}${rowNumber}`,
          values: [row.slice(0, ASSEMBLY_SHEET_COLUMNS.comments + 1)],
        },
        {
          range: `'${ASSEMBLY_SHEET_TAB}'!${firstCategoryLetter}${rowNumber}:${lastCategoryLetter}${rowNumber}`,
          values: [row.slice(firstCategoryIndex, ASSEMBLY_SHEET_LAST_COLUMN_INDEX + 1)],
        },
      ],
    },
  });
}

/**
 * Write a new assembly into the first empty Deal ID row (column B).
 * Avoids values.append, which treats pre-filled formulas in A–S as occupied
 * and can land far below the first available deal slot.
 */
export async function appendAssemblyRow(
  fields: AssemblySheetFields,
): Promise<{ rowNumber: number | null }> {
  const rowNumber = await findFirstEmptyDealRow();
  await updateAssemblyRow(rowNumber, fields);
  return { rowNumber };
}

/**
 * Clear an assembly's sheet row (A–S). The row is cleared rather than deleted
 * so the stored sheetRowNumber of every other assembly stays valid, and the
 * importer skips rows with an empty Deal column.
 */
export async function clearAssemblyRow(rowNumber: number): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const lastLetter = columnLetter(ASSEMBLY_SHEET_LAST_COLUMN_INDEX);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${ASSEMBLY_SHEET_TAB}'!A${rowNumber}:${lastLetter}${rowNumber}`,
  });
}

type BooleanCondition = {
  type?: string | null;
  values?: { userEnteredValue?: string | null }[] | null;
};

function extractLiteralOptions(condition: BooleanCondition | undefined): string[] | null {
  if (!condition?.values) return null;
  if (condition.type === "ONE_OF_LIST") {
    return condition.values
      .map((value) => String(value.userEnteredValue ?? "").trim())
      .filter(Boolean);
  }
  return null;
}

function extractRangeRef(condition: BooleanCondition | undefined): string | null {
  if (condition?.type !== "ONE_OF_RANGE") return null;
  const raw = condition.values?.[0]?.userEnteredValue;
  if (!raw) return null;
  return raw.replace(/^=/, "").trim() || null;
}

let dropdownCache: { at: number; value: SheetDropdownOptions } | null = null;
const DROPDOWN_TTL_MS = 5 * 60 * 1000;

/**
 * Read the Status (L), Priority (M) and Issue category (O) dropdown option
 * lists from the sheet's data validation so the form mirrors the sheet. Falls
 * back to empty lists (form renders free-text) if validation can't be read.
 */
export async function getAssemblyDropdownOptions(): Promise<SheetDropdownOptions> {
  if (dropdownCache && Date.now() - dropdownCache.at < DROPDOWN_TTL_MS) {
    return dropdownCache.value;
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const statusLetter = columnLetter(ASSEMBLY_SHEET_COLUMNS.status);
    const priorityLetter = columnLetter(ASSEMBLY_SHEET_COLUMNS.priority);
    const issueCategoryLetter = columnLetter(ASSEMBLY_SHEET_COLUMNS.issueCategory);

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [
        `'${ASSEMBLY_SHEET_TAB}'!${statusLetter}2`,
        `'${ASSEMBLY_SHEET_TAB}'!${priorityLetter}2`,
        `'${ASSEMBLY_SHEET_TAB}'!${issueCategoryLetter}2`,
      ],
      includeGridData: true,
      fields: "sheets(data(rowData(values(dataValidation))))",
    });

    const dataBlocks = response.data.sheets?.[0]?.data ?? [];
    const conditions = dataBlocks.map(
      (block) => block.rowData?.[0]?.values?.[0]?.dataValidation?.condition as
        | BooleanCondition
        | undefined,
    );

    const resolveOptions = async (condition: BooleanCondition | undefined): Promise<string[]> => {
      const literal = extractLiteralOptions(condition);
      if (literal) return literal;

      const rangeRef = extractRangeRef(condition);
      if (!rangeRef) return [];
      try {
        const ref = rangeRef.includes("!") ? rangeRef : `'${ASSEMBLY_SHEET_TAB}'!${rangeRef}`;
        const rangeResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: ref,
        });
        const seen = new Set<string>();
        const options: string[] = [];
        for (const row of rangeResponse.data.values ?? []) {
          const value = String(row?.[0] ?? "").trim();
          if (value && !seen.has(value)) {
            seen.add(value);
            options.push(value);
          }
        }
        return options;
      } catch {
        return [];
      }
    };

    const [status, priority, issueCategory] = await Promise.all([
      resolveOptions(conditions[0]),
      resolveOptions(conditions[1]),
      resolveOptions(conditions[2]),
    ]);

    const value: SheetDropdownOptions = { status, priority, issueCategory };
    dropdownCache = { at: Date.now(), value };
    return value;
  } catch {
    return EMPTY_SHEET_DROPDOWN_OPTIONS;
  }
}
