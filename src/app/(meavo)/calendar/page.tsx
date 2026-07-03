import { cookies } from "next/headers";
import { AssemblyCalendar, type CalendarEvent } from "@/components/assembly-calendar";
import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";
import { toAssemblyFormValues, toIsoDate } from "@/lib/assembly-form-values";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const MARKET_COOKIE = "calendar_market";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function normalizeMonth(value: string | undefined): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonthKey();
}

/** Visible 6-week grid range (Monday-start) for the given month. */
function gridRange(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 41);
  return { start, end };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; market?: string }>;
}) {
  await requireMeavoAccess();

  const params = await searchParams;
  const cookieStore = await cookies();

  const month = normalizeMonth(params.month);
  // Explicit `market` param wins; otherwise fall back to the saved cookie.
  const market =
    params.market !== undefined
      ? params.market.trim()
      : (cookieStore.get(MARKET_COOKIE)?.value ?? "").trim();

  const { start, end } = gridRange(month);

  const [assemblies, marketRows, options, partnerSuggestions] = await Promise.all([
    prisma.assembly.findMany({
      where: {
        assemblyDate: { gte: start, lte: end },
        ...(market ? { market } : {}),
      },
      orderBy: [{ assemblyDate: "asc" }, { dealId: "asc" }],
      include: { submissions: { select: { status: true } } },
      take: 1000,
    }),
    prisma.assembly.findMany({
      where: { market: { not: "" } },
      distinct: ["market"],
      select: { market: true },
      orderBy: { market: "asc" },
    }),
    getAssemblyDropdownOptions(),
    getPartnerNameSuggestions(),
  ]);

  const markets = marketRows.map((row) => row.market);

  const events: CalendarEvent[] = assemblies.map((assembly) => ({
    id: assembly.id,
    dateKey: toIsoDate(assembly.assemblyDate) || null,
    submitted: assembly.submissions.some((s) => s.status === "SUBMITTED"),
    values: toAssemblyFormValues(assembly),
  }));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Assemblies by month, coloured by market. Click an event to view or edit it."
      />
      <AssemblyCalendar
        events={events}
        month={month}
        market={market}
        markets={markets}
        deliveryCompanies={partnerSuggestions.deliveryCompanies}
        installCompanies={partnerSuggestions.installCompanies}
        options={options}
      />
    </>
  );
}
