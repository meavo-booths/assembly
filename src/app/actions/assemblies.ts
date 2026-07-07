"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { resolveInstallPartnerId } from "@/lib/assembly-partners";
import {
  appendAssemblyRow,
  clearAssemblyRow,
  findSheetRowByDealId,
  updateAssemblyRow,
  type AssemblySheetFields,
} from "@/lib/sheets-export";
import {
  clientTypeToChannel,
  issueToSheet,
  parseEventType,
  parseInternalTeam,
  parseIssue,
} from "@/lib/assembly-schedule";
import { MAX_ISSUE_CATEGORIES } from "@/lib/sheets-columns";

type ParsedAssembly = {
  dealId: string;
  linkedDealId: string | null;
  assemblyDate: Date | null;
  assemblyTime: string | null;
  market: string;
  clientName: string;
  channelType: string;
  eventType: ReturnType<typeof parseEventType>;
  internalTeam: ReturnType<typeof parseInternalTeam>;
  clientEmail: string | null;
  clientPhone: string | null;
  assemblyAddress: string | null;
  deliveryPartnerName: string;
  installPartnerName: string;
  closure: boolean;
  survey: boolean;
  fulfilledOn: Date | null;
  issue: ReturnType<typeof parseIssue>;
  status: string | null;
  priority: string | null;
  issueCategories: string[];
  comments: string | null;
};

function parseIsoDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAssemblyTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseAssemblyForm(formData: FormData): { data?: ParsedAssembly; error?: string } {
  const dealId = str(formData, "dealId");
  const linkedDealId = str(formData, "linkedDealId");

  if (!dealId) return { error: "Assembly ID is required." };

  const assemblyDate = parseIsoDateInput(str(formData, "assemblyDate"));
  if (!assemblyDate) return { error: "Assembly date is required." };

  return {
    data: {
      dealId,
      linkedDealId: linkedDealId || null,
      assemblyDate,
      assemblyTime: parseAssemblyTime(str(formData, "assemblyTime")),
      market: str(formData, "market"),
      clientName: str(formData, "clientName"),
      channelType: str(formData, "channelType"),
      eventType: parseEventType(formData.get("eventType")),
      internalTeam: parseInternalTeam(formData.get("internalTeam")),
      clientEmail: null,
      clientPhone: null,
      assemblyAddress: str(formData, "assemblyAddress") || null,
      deliveryPartnerName: str(formData, "deliveryPartnerName"),
      installPartnerName: str(formData, "installPartnerName"),
      closure: formData.get("closure") === "on" || formData.get("closure") === "true",
      survey: formData.get("survey") === "on" || formData.get("survey") === "true",
      fulfilledOn: parseIsoDateInput(str(formData, "fulfilledOn")),
      issue: parseIssue(formData.get("issue")),
      status: str(formData, "status") || null,
      priority: str(formData, "priority") || null,
      issueCategories: formData
        .getAll("issueCategory")
        .map((value) => String(value).trim())
        .filter(Boolean)
        .slice(0, MAX_ISSUE_CATEGORIES),
      comments: str(formData, "comments") || null,
    },
  };
}

function toSheetFields(data: ParsedAssembly): AssemblySheetFields {
  return {
    assemblyDate: data.assemblyDate,
    dealId: data.dealId,
    market: data.market,
    clientName: data.clientName,
    channelType: data.channelType,
    closure: data.closure,
    survey: data.survey,
    fulfilledOn: data.fulfilledOn,
    deliveryPartnerName: data.deliveryPartnerName,
    installPartnerName: data.installPartnerName,
    issue: issueToSheet(data.issue),
    status: data.status ?? "",
    priority: data.priority ?? "",
    comments: data.comments ?? "",
    issueCategories: data.issueCategories,
  };
}

function revalidateAssemblyViews(dealId: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath(`/assemblies/${dealId}`);
}

export async function createAssembly(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();

  const parsed = parseAssemblyForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const data = parsed.data;

  const existing = await prisma.assembly.findUnique({ where: { dealId: data.dealId } });
  if (existing) return { error: `Assembly ID "${data.dealId}" already exists.` };

  if (data.linkedDealId) {
    const deal = await prisma.deal.findUnique({ where: { dealId: data.linkedDealId } });
    if (!deal) return { error: `Deal "${data.linkedDealId}" not found.` };

    // The deal is the source of truth for these when linked.
    data.market = deal.market || data.market;
    data.channelType = clientTypeToChannel(deal.clientType) || data.channelType;
    data.clientName = deal.clientName || data.clientName;
  }

  const installPartnerId = data.installPartnerName
    ? await resolveInstallPartnerId(data.installPartnerName)
    : null;

  // Fail closed: only create the DB row if the sheet append succeeds.
  let rowNumber: number | null = null;
  try {
    const result = await appendAssemblyRow(toSheetFields(data));
    rowNumber = result.rowNumber;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write to the Google Sheet.";
    return { error: `Sheet update failed: ${message}` };
  }

  await prisma.assembly.create({
    data: {
      dealId: data.dealId,
      linkedDealId: data.linkedDealId,
      assemblyDate: data.assemblyDate,
      assemblyTime: data.assemblyTime,
      market: data.market,
      clientName: data.clientName,
      channelType: data.channelType,
      deliveryPartnerName: data.deliveryPartnerName,
      installPartnerName: data.installPartnerName,
      installPartnerId,
      source: "APP_CREATED",
      eventType: data.eventType,
      internalTeam: data.internalTeam,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      assemblyAddress: data.assemblyAddress,
      closure: data.closure,
      survey: data.survey,
      fulfilledOn: data.fulfilledOn,
      issue: data.issue,
      status: data.status,
      priority: data.priority,
      issueCategories: data.issueCategories,
      comments: data.comments,
      sheetRowNumber: rowNumber,
      lastImportedAt: new Date(),
    },
  });

  revalidateAssemblyViews(data.dealId);
  return {};
}

export async function updateAssembly(
  formData: FormData,
): Promise<{ error?: string; dealId?: string }> {
  await requireMeavoAccess();

  const id = str(formData, "id");
  if (!id) return { error: "Assembly not found." };

  const parsed = parseAssemblyForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const data = parsed.data;

  const assembly = await prisma.assembly.findUnique({ where: { id } });
  if (!assembly) return { error: "Assembly not found." };

  if (data.linkedDealId) {
    const deal = await prisma.deal.findUnique({ where: { dealId: data.linkedDealId } });
    if (!deal) return { error: `Deal "${data.linkedDealId}" not found.` };
    data.market = deal.market || data.market;
    data.channelType = clientTypeToChannel(deal.clientType) || data.channelType;
    data.clientName = deal.clientName || data.clientName;
  }

  // The assembly ID (sheet column B, URL param) is renameable; make sure the
  // new name is free before touching the sheet.
  const dealId = data.dealId;
  if (dealId !== assembly.dealId) {
    const taken = await prisma.assembly.findUnique({ where: { dealId } });
    if (taken) return { error: `Assembly ID "${dealId}" already exists.` };
  }

  const sheetData = toSheetFields({ ...data, dealId });

  // Resolve the sheet row (stored number, else look up by the current ID).
  let rowNumber = assembly.sheetRowNumber ?? null;
  try {
    if (!rowNumber) rowNumber = await findSheetRowByDealId(assembly.dealId);
    if (!rowNumber) {
      return { error: "Could not find this assembly's row in the Google Sheet." };
    }
    await updateAssemblyRow(rowNumber, sheetData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write to the Google Sheet.";
    return { error: `Sheet update failed: ${message}` };
  }

  const installPartnerId = data.installPartnerName
    ? await resolveInstallPartnerId(data.installPartnerName)
    : null;

  await prisma.assembly.update({
    where: { id },
    data: {
      dealId,
      linkedDealId: data.linkedDealId,
      assemblyDate: data.assemblyDate,
      assemblyTime: data.assemblyTime,
      market: data.market,
      clientName: data.clientName,
      channelType: data.channelType,
      deliveryPartnerName: data.deliveryPartnerName,
      installPartnerName: data.installPartnerName,
      installPartnerId,
      eventType: data.eventType,
      internalTeam: data.internalTeam,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      assemblyAddress: data.assemblyAddress,
      closure: data.closure,
      survey: data.survey,
      fulfilledOn: data.fulfilledOn,
      issue: data.issue,
      status: data.status,
      priority: data.priority,
      issueCategories: data.issueCategories,
      comments: data.comments,
      sheetRowNumber: rowNumber,
      sheetSyncError: null,
    },
  });

  if (dealId !== assembly.dealId) revalidateAssemblyViews(assembly.dealId);
  revalidateAssemblyViews(dealId);
  return { dealId };
}

export async function deleteAssembly(id: string): Promise<{ error?: string }> {
  await requireMeavoAccess();

  const assembly = await prisma.assembly.findUnique({ where: { id } });
  if (!assembly) return { error: "Assembly not found." };

  // Clear the sheet row first (fail closed, like create/update). The row is
  // blanked rather than removed so other assemblies' row numbers stay valid.
  try {
    const rowNumber = assembly.sheetRowNumber ?? (await findSheetRowByDealId(assembly.dealId));
    if (rowNumber) await clearAssemblyRow(rowNumber);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write to the Google Sheet.";
    return { error: `Sheet update failed: ${message}` };
  }

  // Questionnaire submissions (answers, photos) cascade with the assembly.
  await prisma.assembly.delete({ where: { id } });

  revalidateAssemblyViews(assembly.dealId);
  if (assembly.linkedDealId) revalidatePath(`/deals/${assembly.linkedDealId}`);
  revalidatePath("/deals");
  return {};
}
