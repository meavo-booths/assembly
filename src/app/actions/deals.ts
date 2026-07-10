"use server";

import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { assembliesForDealWhere, dealSummaryInclude } from "@/lib/deal-queries";
import {
  buildLinkedDealSummary,
  suggestAssemblyId,
  type LinkedDealSummary,
} from "@/lib/deal-summary";

export type DealSearchHit = {
  dealId: string;
  clientName: string;
  quoteNumber: string;
};

/** Search deals by Deal ID or client name for the assembly create form. */
export async function searchDealsForAssemblyAction(query: string): Promise<DealSearchHit[]> {
  await requireMeavoAccess();

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const deals = await prisma.deal.findMany({
    where: {
      dealId: { not: null },
      OR: [
        { dealId: { contains: trimmed, mode: "insensitive" } },
        { clientName: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { dealId: true, clientName: true, quoteNumber: true },
    orderBy: { dealDate: "desc" },
    take: 10,
  });

  return deals
    .filter((deal): deal is typeof deal & { dealId: string } => Boolean(deal.dealId))
    .map((deal) => ({
      dealId: deal.dealId,
      clientName: deal.clientName,
      quoteNumber: deal.quoteNumber,
    }));
}

export type DealForAssemblyResult = {
  summary: LinkedDealSummary;
  suggestedAssemblyId: string;
  channelType: string;
};

/** Load a deal summary and suggest the next assembly ID for linking. */
export async function getDealForAssemblyAction(
  dealId: string,
): Promise<DealForAssemblyResult | { error: string }> {
  await requireMeavoAccess();

  const deal = await prisma.deal.findUnique({
    where: { dealId },
    include: dealSummaryInclude,
  });
  if (!deal || !deal.dealId) return { error: `Deal "${dealId}" not found.` };

  const assemblies = await prisma.assembly.findMany({
    where: assembliesForDealWhere(dealId),
    select: { dealId: true },
  });
  const takenIds = new Set(assemblies.map((assembly) => assembly.dealId));
  const suggestedAssemblyId = suggestAssemblyId(dealId, takenIds);
  const summary = buildLinkedDealSummary(deal);

  return {
    summary,
    suggestedAssemblyId,
    channelType: summary.clientType,
  };
}
