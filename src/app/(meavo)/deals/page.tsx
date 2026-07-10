import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { loadScheduleFormContext } from "@/lib/schedule-form-context";
import { getAssemblyMarkets } from "@/lib/assembly-form-suggestions";
import { dealSummaryInclude } from "@/lib/deal-queries";
import { eventTypeLabel } from "@/lib/assembly-schedule";
import {
  buildAssemblyPrefill,
  buildLinkedDealSummary,
  formatDealDate,
  suggestAssemblyId,
} from "@/lib/deal-summary";
import { ReadyDealCard, type LinkedAssemblySummary } from "@/components/ready-deal-card";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReadyDealsPage() {
  await requireMeavoAccess();

  const [deals, formContext, markets] = await Promise.all([
    prisma.deal.findMany({
      where: { stage: "WON", readyToAssemble: true, dealId: { not: null } },
      orderBy: { wonAt: "desc" },
      include: dealSummaryInclude,
    }),
    loadScheduleFormContext(),
    getAssemblyMarkets(),
  ]);

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
          select: {
            dealId: true,
            linkedDealId: true,
            eventType: true,
            assemblyDate: true,
            closure: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const takenIds = new Set(linkedAssemblies.map((assembly) => assembly.dealId));

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

            const assemblies: LinkedAssemblySummary[] = linkedAssemblies
              .filter(
                (assembly) =>
                  assembly.linkedDealId === dealId || assembly.dealId === dealId,
              )
              .map((assembly) => ({
                dealId: assembly.dealId,
                eventType: eventTypeLabel(assembly.eventType),
                assemblyDate: assembly.assemblyDate
                  ? formatDealDate(assembly.assemblyDate)
                  : "",
                closure: assembly.closure,
              }));

            return (
              <ReadyDealCard
                key={deal.id}
                deal={buildLinkedDealSummary(deal)}
                linkedAssemblies={assemblies}
                prefill={buildAssemblyPrefill(deal, suggestAssemblyId(dealId, takenIds))}
                options={formContext.options}
                markets={markets}
                deliveryCompanies={formContext.deliveryCompanies}
                installCompanies={formContext.installCompanies}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
