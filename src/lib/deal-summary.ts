/**
 * Server-side helpers mapping a sales Deal row (with contacts and line items)
 * to the read-only summary and the prefilled create-assembly form values used
 * by the Ready deals page and the deal detail page.
 */
import type { Prisma } from "@prisma/client";
import {
  emptyAssemblyFormValues,
  type AssemblyFormValues,
} from "@/lib/assembly-form-values";
import { clientTypeToChannel } from "@/lib/assembly-schedule";

export type LinkedDealContact = {
  kind: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

/** Read-only summary of the sales deal shown next to assemblies. */
export type LinkedDealSummary = {
  dealId: string;
  quoteNumber: string;
  clientName: string;
  /** VIP flag of the linked client — surfaces the sales app's VIP label here. */
  isVip: boolean;
  dealDate: string;
  salesRep: string;
  market: string;
  clientType: string;
  paymentStatus: string;
  vatNumber: string;
  registeredAddress: string;
  assemblyAddress: string;
  notes: string;
  boothSummary: string;
  contacts: LinkedDealContact[];
};

export type DealForSummary = Prisma.DealGetPayload<{
  include: {
    contacts: true;
    lineItems: { include: { product: true } };
    client: { select: { isVip: true } };
  };
}>;

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

const CONTACT_KIND_LABELS: Record<string, string> = {
  MAIN: "Main contact",
  FINANCE: "Finance contact",
  ASSEMBLY: "Assembly contact",
};

export function formatDealDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function buildLinkedDealSummary(deal: DealForSummary): LinkedDealSummary {
  const boothSummary = deal.lineItems
    .filter((item) => item.product?.kind === "BOOTH")
    .map((item) => `${item.quantity}× ${item.product!.name}`)
    .join(", ");

  return {
    dealId: deal.dealId ?? "",
    quoteNumber: deal.quoteNumber,
    clientName: deal.clientName,
    isVip: deal.client?.isVip ?? false,
    dealDate: formatDealDate(deal.dealDate),
    salesRep: deal.salesRep,
    market: deal.market,
    clientType: clientTypeToChannel(deal.clientType) || deal.clientType,
    paymentStatus: PAYMENT_STATUS_LABELS[deal.paymentStatus] ?? deal.paymentStatus,
    vatNumber: deal.vatNumber,
    registeredAddress: deal.registeredAddress,
    assemblyAddress: deal.assemblyAddress,
    notes: deal.notes,
    boothSummary,
    contacts: deal.contacts.map((contact) => ({
      kind: CONTACT_KIND_LABELS[contact.kind] ?? contact.kind,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
    })),
  };
}

export function buildAssemblyPrefill(
  deal: DealForSummary,
  suggestedAssemblyId: string,
): AssemblyFormValues {
  return {
    ...emptyAssemblyFormValues(),
    dealId: suggestedAssemblyId,
    linkedDealId: deal.dealId ?? "",
    market: deal.market,
    clientName: deal.clientName,
    channelType: clientTypeToChannel(deal.clientType),
    assemblyAddress: deal.assemblyAddress,
  };
}

/** First free "{DEALID}-ASS", "{DEALID}-ASS2", ... given the taken IDs. */
export function suggestAssemblyId(dealId: string, takenIds: Set<string>): string {
  const base = `${dealId}-ASS`;
  if (!takenIds.has(base)) return base;
  for (let n = 2; ; n += 1) {
    if (!takenIds.has(`${base}${n}`)) return `${base}${n}`;
  }
}
