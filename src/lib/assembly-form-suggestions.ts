import { prisma } from "@/lib/prisma";

/** Distinct partner names mirrored from the Google Sheet (columns I and J). */
export async function getPartnerNameSuggestions(): Promise<{
  deliveryCompanies: string[];
  installCompanies: string[];
}> {
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
}
