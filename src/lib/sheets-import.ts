import { prisma } from "@/lib/prisma";
import { ensurePartner } from "@/lib/assembly-partners";
import { ASSEMBLY_SHEET_TAB, getSheetsClient, getSpreadsheetId } from "@/lib/sheets-client";
import {
  ISSUE_CATEGORY_COLUMN_INDICES,
  cellString,
  parseSheetBoolean,
  parseSheetDate,
  resolveAssemblyColumns,
} from "@/lib/sheets-columns";
import { issueFromSheet } from "@/lib/assembly-schedule";

const UPSERT_BATCH_SIZE = 50;

export async function importAssembliesFromSheet(): Promise<{
  imported: number;
  partnersCreated: number;
  failedRows: number;
}> {
  try {
    return await runImport();
  } catch (error) {
    // Record the failure so /partners and monitoring can see why the last
    // import didn't complete, then let the caller handle the error.
    const message = error instanceof Error ? error.message : "Import failed";
    await prisma.sheetImportState
      .upsert({
        where: { id: "default" },
        create: { id: "default", lastRunAt: new Date(), errorMessage: message },
        update: { lastRunAt: new Date(), errorMessage: message },
      })
      .catch(() => {});
    throw error;
  }
}

/** Sheet-mirrored fields written by the importer (app-only fields are preserved). */
type MirroredFields = {
  assemblyDate: Date | null;
  market: string;
  clientName: string;
  channelType: string;
  deliveryPartnerName: string;
  installPartnerName: string;
  installPartnerId: string | null;
  closure: boolean;
  survey: boolean;
  fulfilledOn: Date | null;
  issue: ReturnType<typeof issueFromSheet>;
  status: string | null;
  priority: string | null;
  comments: string | null;
  issueCategories: string[];
  sheetRowNumber: number;
};

type ExistingRow = MirroredFields & { dealId: string };

function sameDate(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

/** True when a DB row already matches the sheet row (skip the upsert). */
function isUnchanged(existing: ExistingRow, next: MirroredFields): boolean {
  return (
    sameDate(existing.assemblyDate, next.assemblyDate) &&
    existing.market === next.market &&
    existing.clientName === next.clientName &&
    existing.channelType === next.channelType &&
    existing.deliveryPartnerName === next.deliveryPartnerName &&
    existing.installPartnerName === next.installPartnerName &&
    existing.installPartnerId === next.installPartnerId &&
    existing.closure === next.closure &&
    existing.survey === next.survey &&
    sameDate(existing.fulfilledOn, next.fulfilledOn) &&
    existing.issue === next.issue &&
    existing.status === next.status &&
    existing.priority === next.priority &&
    existing.comments === next.comments &&
    existing.issueCategories.length === next.issueCategories.length &&
    existing.issueCategories.every((value, i) => value === next.issueCategories[i]) &&
    existing.sheetRowNumber === next.sheetRowNumber
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function runImport(): Promise<{
  imported: number;
  partnersCreated: number;
  failedRows: number;
}> {
  const spreadsheetId = getSpreadsheetId();
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${ASSEMBLY_SHEET_TAB}'!A:Z`,
  });

  const rows = response.data.values ?? [];
  if (rows.length < 2) {
    await prisma.sheetImportState.upsert({
      where: { id: "default" },
      create: { id: "default", lastRunAt: new Date(), rowCount: 0 },
      update: { lastRunAt: new Date(), rowCount: 0, errorMessage: null },
    });
    return { imported: 0, partnersCreated: 0, failedRows: 0 };
  }

  const columns = resolveAssemblyColumns(rows[0]);

  // Load the current mirrored state once so unchanged rows can be skipped
  // instead of re-upserted every run.
  const existingRows = await prisma.assembly.findMany({
    select: {
      dealId: true,
      assemblyDate: true,
      market: true,
      clientName: true,
      channelType: true,
      deliveryPartnerName: true,
      installPartnerName: true,
      installPartnerId: true,
      closure: true,
      survey: true,
      fulfilledOn: true,
      issue: true,
      status: true,
      priority: true,
      comments: true,
      issueCategories: true,
      sheetRowNumber: true,
    },
  });
  const existingByDealId = new Map(
    existingRows.map((row) => [row.dealId, { ...row, sheetRowNumber: row.sheetRowNumber ?? -1 }]),
  );

  let imported = 0;
  let partnersCreated = 0;
  let failedRows = 0;
  let firstRowError: string | null = null;
  const partnerCache = new Map<string, string | null>();

  async function partnerIdForName(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase();
    if (partnerCache.has(key)) return partnerCache.get(key) ?? null;
    const { partner, created } = await ensurePartner(name);
    if (created) partnersCreated += 1;
    const id = partner?.id ?? null;
    partnerCache.set(key, id);
    return id;
  }

  const pending: { rowIndex: number; dealId: string; mirrored: MirroredFields }[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const dealId = cellString(row, columns.deal);
    if (!dealId) continue;

    // A bad row shouldn't abort the whole run; record and continue.
    try {
      const installName = cellString(row, columns.installDoneBy);
      const deliveryName = cellString(row, columns.deliveryCompany);
      const installPartnerId = installName ? await partnerIdForName(installName) : null;

      // Only sheet-mirrored columns are written; app-only fields (eventType,
      // internalTeam, assemblyAddress, source) are preserved by leaving them
      // out of the update payload.
      const mirrored: MirroredFields = {
        assemblyDate: parseSheetDate(cellString(row, columns.date)),
        market: cellString(row, columns.market),
        clientName: cellString(row, columns.client),
        channelType: cellString(row, columns.clientType),
        deliveryPartnerName: deliveryName,
        installPartnerName: installName,
        installPartnerId,
        closure: parseSheetBoolean(row[columns.closure]),
        survey: parseSheetBoolean(row[columns.survey]),
        fulfilledOn: parseSheetDate(cellString(row, columns.fulfilled)),
        issue: issueFromSheet(row[columns.issue]),
        status: cellString(row, columns.status) || null,
        priority: cellString(row, columns.priority) || null,
        comments: cellString(row, columns.comments) || null,
        issueCategories: ISSUE_CATEGORY_COLUMN_INDICES.map((index) =>
          cellString(row, index),
        ).filter(Boolean),
        sheetRowNumber: i + 1,
      };

      const existing = existingByDealId.get(dealId);
      if (existing && isUnchanged(existing, mirrored)) {
        imported += 1;
        continue;
      }

      pending.push({ rowIndex: i, dealId, mirrored });
    } catch (error) {
      failedRows += 1;
      const message = error instanceof Error ? error.message : "Unknown row error";
      if (!firstRowError) firstRowError = `Row ${i + 1} (${dealId}): ${message}`;
      console.error(`Sheet import failed for row ${i + 1} (${dealId}):`, error);
    }
  }

  // Write changed/new rows in batched transactions; fall back to row-by-row
  // for a failed batch so one bad row doesn't sink its whole chunk.
  const importedAt = new Date();
  for (const batch of chunk(pending, UPSERT_BATCH_SIZE)) {
    const upsertFor = (item: (typeof batch)[number]) =>
      prisma.assembly.upsert({
        where: { dealId: item.dealId },
        create: {
          dealId: item.dealId,
          source: "SHEET_IMPORTED",
          ...item.mirrored,
          lastImportedAt: importedAt,
        },
        update: { ...item.mirrored, lastImportedAt: importedAt },
      });

    try {
      await prisma.$transaction(batch.map(upsertFor));
      imported += batch.length;
    } catch {
      for (const item of batch) {
        try {
          await upsertFor(item);
          imported += 1;
        } catch (error) {
          failedRows += 1;
          const message = error instanceof Error ? error.message : "Unknown row error";
          if (!firstRowError) {
            firstRowError = `Row ${item.rowIndex + 1} (${item.dealId}): ${message}`;
          }
          console.error(
            `Sheet import failed for row ${item.rowIndex + 1} (${item.dealId}):`,
            error,
          );
        }
      }
    }
  }

  const summary =
    failedRows > 0 ? `${failedRows} row(s) failed. First error: ${firstRowError}` : null;

  await prisma.sheetImportState.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      lastRunAt: new Date(),
      rowCount: imported,
      errorMessage: summary,
    },
    update: {
      lastRunAt: new Date(),
      rowCount: imported,
      errorMessage: summary,
    },
  });

  return { imported, partnersCreated, failedRows };
}
