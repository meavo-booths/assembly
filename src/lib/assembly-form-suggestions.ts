import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cache tag for slow-moving assembly reference data (partner name
 * suggestions, market list). Revalidated after sheet imports and assembly
 * mutations; the short TTL covers everything else.
 */
export const ASSEMBLY_REFERENCE_TAG = "assembly-reference";
const REFERENCE_TTL_SECONDS = 300;

/** Distinct partner names mirrored from the Google Sheet (columns I and J). */
export const getPartnerNameSuggestions = unstable_cache(
  async (): Promise<{
    deliveryCompanies: string[];
    installCompanies: string[];
  }> => {
    const [deliveryRows, installRows] = await Promise.all([
      prisma.assembly.findMany({
        where: { deliveryPartnerName: { not: "" } },
        distinct: ["deliveryPartnerName"],
        select: { deliveryPartnerName: true },
        orderBy: { deliveryPartnerName: "asc" },
      }),
      prisma.assembly.findMany({
        where: { installPartnerName: { not: "" } },
        distinct: ["installPartnerName"],
        select: { installPartnerName: true },
        orderBy: { installPartnerName: "asc" },
      }),
    ]);

    return {
      deliveryCompanies: deliveryRows.map((row) => row.deliveryPartnerName),
      installCompanies: installRows.map((row) => row.installPartnerName),
    };
  },
  ["partner-name-suggestions"],
  { revalidate: REFERENCE_TTL_SECONDS, tags: [ASSEMBLY_REFERENCE_TAG] },
);

/** Distinct markets across all assemblies (filter dropdowns). */
export const getAssemblyMarkets = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.assembly.findMany({
      where: { market: { not: "" } },
      distinct: ["market"],
      select: { market: true },
      orderBy: { market: "asc" },
    });
    return rows.map((row) => row.market);
  },
  ["assembly-markets"],
  { revalidate: REFERENCE_TTL_SECONDS, tags: [ASSEMBLY_REFERENCE_TAG] },
);
