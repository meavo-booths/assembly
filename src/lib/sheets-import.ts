import { prisma } from "@/lib/prisma";
import { ensurePartner } from "@/lib/assembly-partners";
import { ASSEMBLY_SHEET_TAB, getSheetsClient, getSpreadsheetId } from "@/lib/sheets-client";
import {
  cellString,
  parseSheetBoolean,
  parseSheetDate,
  resolveAssemblyColumns,
} from "@/lib/sheets-columns";
import { issueFromSheet } from "@/lib/assembly-schedule";

export async function importAssembliesFromSheet(): Promise<{
  imported: number;
  partnersCreated: number;
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
    return { imported: 0, partnersCreated: 0 };
  }

  const columns = resolveAssemblyColumns(rows[0]);

  let imported = 0;
  let partnersCreated = 0;
  const partnerCache = new Map<string, string | null>();

  async function partnerIdForName(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase();
    if (partnerCache.has(key)) return partnerCache.get(key) ?? null;
    const before = await prisma.assemblyPartner.count();
    const partner = await ensurePartner(name);
    const after = await prisma.assemblyPartner.count();
    if (after > before) partnersCreated += 1;
    const id = partner?.id ?? null;
    partnerCache.set(key, id);
    return id;
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const dealId = cellString(row, columns.deal);
    if (!dealId) continue;

    const installName = cellString(row, columns.installDoneBy);
    const deliveryName = cellString(row, columns.deliveryCompany);
    const installPartnerId = installName ? await partnerIdForName(installName) : null;

    // Only sheet-mirrored columns are written; app-only fields (eventType,
    // internalTeam, clientEmail/Phone, assemblyAddress, source) are preserved
    // by leaving them out of the update payload.
    const mirrored = {
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
      issueCategory: cellString(row, columns.issueCategory) || null,
      lastImportedAt: new Date(),
    };

    await prisma.assembly.upsert({
      where: { dealId },
      create: { dealId, source: "SHEET_IMPORTED", ...mirrored },
      update: mirrored,
    });
    imported += 1;
  }

  await prisma.sheetImportState.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      lastRunAt: new Date(),
      rowCount: imported,
      errorMessage: null,
    },
    update: {
      lastRunAt: new Date(),
      rowCount: imported,
      errorMessage: null,
    },
  });

  return { imported, partnersCreated };
}
