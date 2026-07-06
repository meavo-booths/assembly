import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";
import { eventTypeLabel } from "@/lib/assembly-schedule";
import {
  buildAssemblyPrefill,
  buildLinkedDealSummary,
  formatDealDate,
  suggestAssemblyId,
} from "@/lib/deal-summary";
import { ScheduleAssemblyButton } from "@/components/ready-deal-card";
import { LinkedDealBoxes } from "@/components/linked-deal-card";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  await requireMeavoAccess();
  const { dealId: rawDealId } = await params;
  const dealId = decodeURIComponent(rawDealId);

  const deal = await prisma.deal.findUnique({
    where: { dealId },
    include: {
      contacts: { orderBy: { sortOrder: "asc" } },
      lineItems: { include: { product: true }, orderBy: { sortOrder: "asc" } },
      client: { select: { isVip: true } },
    },
  });
  if (!deal || !deal.dealId) notFound();

  const [assemblies, dropdownOptions, partnerSuggestions, marketRows] = await Promise.all([
    prisma.assembly.findMany({
      where: {
        OR: [
          { linkedDealId: dealId },
          { dealId },
          { dealId: { startsWith: `${dealId}-ASS` } },
        ],
      },
      select: {
        dealId: true,
        linkedDealId: true,
        eventType: true,
        assemblyDate: true,
        closure: true,
        status: true,
        installPartnerName: true,
      },
      orderBy: { createdAt: "asc" },
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

  const linked = assemblies.filter(
    (assembly) => assembly.linkedDealId === dealId || assembly.dealId === dealId,
  );
  const activeAssembly = linked.find((assembly) => !assembly.closure);
  const takenIds = new Set(assemblies.map((assembly) => assembly.dealId));
  const summary = buildLinkedDealSummary(deal);

  return (
    <>
      <PageHeader title={`Deal ${deal.dealId}`} description={deal.clientName}>
        <div className="flex flex-wrap items-center gap-2">
          {deal.readyToAssemble && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Ready to assemble
            </span>
          )}
          <Link href="/deals" className="text-sm text-brand-700 underline">
            Back to Ready deals
          </Link>
        </div>
      </PageHeader>

      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Assemblies</h2>
            {activeAssembly ? (
              <p className="text-xs text-slate-500">
                Close {activeAssembly.dealId} (Closure tickbox) to schedule another one.
              </p>
            ) : (
              <ScheduleAssemblyButton
                deal={summary}
                prefill={buildAssemblyPrefill(deal, suggestAssemblyId(dealId, takenIds))}
                options={dropdownOptions}
                markets={marketRows.map((row) => row.market)}
                deliveryCompanies={partnerSuggestions.deliveryCompanies}
                installCompanies={partnerSuggestions.installCompanies}
              />
            )}
          </div>
          {linked.length === 0 ? (
            <p className="text-sm text-slate-500">No assemblies scheduled for this deal yet.</p>
          ) : (
            <ul className="space-y-2">
              {linked.map((assembly) => (
                <li key={assembly.dealId}>
                  <Link
                    href={`/assemblies/${encodeURIComponent(assembly.dealId)}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-brand-500/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {assembly.dealId}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {eventTypeLabel(assembly.eventType)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {assembly.assemblyDate
                          ? formatDealDate(assembly.assemblyDate)
                          : "No date"}
                        {assembly.installPartnerName && ` · ${assembly.installPartnerName}`}
                        {assembly.status && ` · ${assembly.status}`}
                      </p>
                    </div>
                    {assembly.closure ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Closed
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        Active
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <LinkedDealBoxes deal={summary} />
      </div>
    </>
  );
}
