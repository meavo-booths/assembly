import type { Prisma } from "@prisma/client";

/** Include shape for loading a Deal with everything the summary boxes need. */
export const dealSummaryInclude = {
  contacts: { orderBy: { sortOrder: "asc" as const } },
  lineItems: { include: { product: true }, orderBy: { sortOrder: "asc" as const } },
  client: { select: { isVip: true } },
} satisfies Prisma.DealInclude;

/**
 * Where-clause matching every assembly that belongs to a deal: explicitly
 * linked rows, rows named exactly after the deal, and app-created rows using
 * the "{DEALID}-ASS…" naming scheme (they block ID suggestions too).
 */
export function assembliesForDealWhere(dealId: string): Prisma.AssemblyWhereInput {
  return {
    OR: [
      { linkedDealId: dealId },
      { dealId },
      { dealId: { startsWith: `${dealId}-ASS` } },
    ],
  };
}
