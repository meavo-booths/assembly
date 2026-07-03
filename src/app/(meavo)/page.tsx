import Link from "next/link";
import { Suspense } from "react";
import { SubmissionStatus } from "@prisma/client";
import { AssemblyListCard } from "@/components/assembly-list-card";
import { ScheduleAssemblyCard } from "@/components/schedule-assembly-card";
import { AssemblyFilters } from "@/components/assembly-filters";
import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import {
  buildAssemblyWhere,
  formatFilterDateLabel,
  parseAssemblyFilters,
} from "@/lib/assembly-filters";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AssembliesPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    from?: string;
    to?: string;
    market?: string;
    partner?: string;
    q?: string;
  }>;
}) {
  await requireMeavoAccess();

  const params = await searchParams;
  const filters = parseAssemblyFilters(params);
  const where = buildAssemblyWhere(filters);

  const [assemblies, importState, marketRows, partners, dropdownOptions, partnerSuggestions] =
    await Promise.all([
    prisma.assembly.findMany({
      where,
      orderBy: [{ assemblyDate: "asc" }, { dealId: "asc" }],
      include: {
        installPartner: true,
        submissions: { select: { status: true } },
      },
      take: 500,
    }),
    prisma.sheetImportState.findUnique({ where: { id: "default" } }),
    prisma.assembly.findMany({
      where: { market: { not: "" } },
      distinct: ["market"],
      select: { market: true },
      orderBy: { market: "asc" },
    }),
    prisma.assemblyPartner.findMany({
      where: { isInternal: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getAssemblyDropdownOptions(),
    getPartnerNameSuggestions(),
  ]);

  const markets = marketRows.map((row) => row.market);
  const dateLabel = formatFilterDateLabel(filters);
  const marketLabel = filters.market ?? "All markets";
  const partnerLabel =
    partners.find((partner) => partner.id === filters.partnerId)?.name ?? "All partners";

  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-2 lg:items-start">
        <Suspense fallback={null}>
          <AssemblyFilters filters={filters} markets={markets} partners={partners} />
        </Suspense>

        <ScheduleAssemblyCard
          options={dropdownOptions}
          markets={markets}
          deliveryCompanies={partnerSuggestions.deliveryCompanies}
          installCompanies={partnerSuggestions.installCompanies}
        />
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Showing {assemblies.length} {assemblies.length === 1 ? "assembly" : "assemblies"} for{" "}
        <span className="font-medium text-slate-700">{dateLabel}</span>
        {filters.market ? (
          <>
            {" "}
            in <span className="font-medium text-slate-700">{marketLabel}</span>
          </>
        ) : null}
        {filters.partnerId ? (
          <>
            {" "}
            for <span className="font-medium text-slate-700">{partnerLabel}</span>
          </>
        ) : null}
        {filters.search ? (
          <>
            {" "}
            matching <span className="font-medium text-slate-700">&quot;{filters.search}&quot;</span>
          </>
        ) : null}
        {importState?.lastRunAt ? (
          <>
            {" "}
            · Last import: {importState.lastRunAt.toLocaleString("en-GB")} ({importState.rowCount}{" "}
            rows)
          </>
        ) : null}
      </p>

      <div className="grid gap-3">
        {assemblies.map((assembly) => {
          const submitted = assembly.submissions.some((s) => s.status === SubmissionStatus.SUBMITTED);
          return (
            <Link key={assembly.id} href={`/assemblies/${encodeURIComponent(assembly.dealId)}`}>
              <AssemblyListCard
                dealId={assembly.dealId}
                clientName={assembly.clientName}
                channelType={assembly.channelType}
                assemblyDate={assembly.assemblyDate}
                market={assembly.market}
                installPartnerName={assembly.installPartnerName}
                deliveryPartnerName={assembly.deliveryPartnerName}
                submitted={submitted}
                eventType={assembly.eventType}
                internalTeam={assembly.internalTeam}
                issue={assembly.issue}
                status={assembly.status}
                priority={assembly.priority}
                closure={assembly.closure}
                survey={assembly.survey}
                fulfilledOn={assembly.fulfilledOn}
              />
            </Link>
          );
        })}
        {assemblies.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              No assemblies match these filters. Try another date, market, partner, or search term, or
              refresh from the sheet.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
