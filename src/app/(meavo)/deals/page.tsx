import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";
import { eventTypeLabel } from "@/lib/assembly-schedule";
import { emptyAssemblyFormValues } from "@/lib/assembly-form-values";
import { ReadyDealCard, type LinkedAssemblySummary } from "@/components/ready-deal-card";
import type { LinkedDealSummary } from "@/components/linked-deal-card";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  AGENCY: "Agency",
  COWORKING: "CoWorking",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

const CONTACT_KIND_LABELS: Record<string, string> = {
  MAIN: "Main contact",
  FINANCE: "Finance contact",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ReadyDealsPage() {
  await requireMeavoAccess();

  const [deals, dropdownOptions, partnerSuggestions, marketRows] = await Promise.all([
    prisma.deal.findMany({
      where: { stage: "WON", readyToAssemble: true, dealId: { not: null } },
      orderBy: { wonAt: "desc" },
      include: {
        contacts: { orderBy: { sortOrder: "asc" } },
        lineItems: { include: { product: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    getAssemblyDropdownOptions(),
    getPartnerNameSuggestions(),
    prisma.assembly.findMany({
      where: { market: { not: "" } },
      distinct: ["market"],
      select: { market: true },
      orderBy: { market: "asc" },
    }),
  ]);
  const markets = marketRows.map((row) => row.market);

  const dealIds = deals.flatMap((deal) => (deal.dealId ? [deal.dealId] : []));
  const linkedAssemblies =
    dealIds.length > 0
      ? await prisma.assembly.findMany({
          where: {
            OR: [
              { linkedDealId: { in: dealIds } },
              { dealId: { in: dealIds } },
              // App-created assemblies named after the deal ("{DEALID}-ASS...")
              // also block ID suggestions.
              ...dealIds.map((dealId) => ({ dealId: { startsWith: `${dealId}-ASS` } })),
            ],
          },
          select: { dealId: true, linkedDealId: true, eventType: true, assemblyDate: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const takenIds = new Set(linkedAssemblies.map((assembly) => assembly.dealId));
  const suggestAssemblyId = (dealId: string): string => {
    const base = `${dealId}-ASS`;
    if (!takenIds.has(base)) return base;
    for (let n = 2; ; n += 1) {
      if (!takenIds.has(`${base}${n}`)) return `${base}${n}`;
    }
  };

  return (
    <>
      <PageHeader
        title="Ready deals"
        description="Won deals marked ready to assemble by the sales team. Schedule one or more assemblies for each."
      />

      {deals.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No deals are marked ready to assemble yet. Sales flags them from the deal page in
            the sales app.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {deals.map((deal) => {
            const dealId = deal.dealId!;
            const mainContact =
              deal.contacts.find((contact) => contact.kind === "MAIN") ?? deal.contacts[0];
            const boothSummary = deal.lineItems
              .filter((item) => item.product.kind === "BOOTH")
              .map((item) => `${item.quantity}× ${item.product.name}`)
              .join(", ");

            const summary: LinkedDealSummary = {
              dealId,
              quoteNumber: deal.quoteNumber,
              clientName: deal.clientName,
              dealDate: formatDate(deal.dealDate),
              salesRep: deal.salesRep,
              market: deal.market,
              clientType: CLIENT_TYPE_LABELS[deal.clientType] ?? deal.clientType,
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

            const assemblies: LinkedAssemblySummary[] = linkedAssemblies
              .filter(
                (assembly) =>
                  assembly.linkedDealId === dealId || assembly.dealId === dealId,
              )
              .map((assembly) => ({
                dealId: assembly.dealId,
                eventType: eventTypeLabel(assembly.eventType),
                assemblyDate: assembly.assemblyDate
                  ? formatDate(assembly.assemblyDate)
                  : "",
              }));

            const prefill = {
              ...emptyAssemblyFormValues(),
              dealId: suggestAssemblyId(dealId),
              linkedDealId: dealId,
              market: deal.market,
              clientName: deal.clientName,
              channelType: CLIENT_TYPE_LABELS[deal.clientType] ?? "",
              clientEmail: mainContact?.email ?? "",
              clientPhone: mainContact?.phone ?? "",
              assemblyAddress: deal.assemblyAddress,
            };

            return (
              <ReadyDealCard
                key={deal.id}
                deal={summary}
                linkedAssemblies={assemblies}
                prefill={prefill}
                options={dropdownOptions}
                markets={markets}
                deliveryCompanies={partnerSuggestions.deliveryCompanies}
                installCompanies={partnerSuggestions.installCompanies}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
