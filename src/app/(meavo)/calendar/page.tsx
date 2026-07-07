import { cookies } from "next/headers";
import { AssemblyCalendar, type CalendarEvent } from "@/components/assembly-calendar";
import {
  gridRangeForMonth,
  gridRangeForWeek,
  londonDateKey,
  normalizeMonth,
  normalizeView,
  normalizeWeek,
  type CalendarView,
} from "@/lib/calendar-dates";
import { getAssemblyDropdownOptions } from "@/lib/sheets-export";
import { getPartnerNameSuggestions } from "@/lib/assembly-form-suggestions";
import { toAssemblyFormValues } from "@/lib/assembly-form-values";
import { buildLinkedDealSummary } from "@/lib/deal-summary";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MARKET_COOKIE = "calendar_market";
const VIEW_COOKIE = "calendar_view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string; view?: string; market?: string }>;
}) {
  await requireMeavoAccess();

  const params = await searchParams;
  const cookieStore = await cookies();

  const view: CalendarView =
    params.view !== undefined
      ? normalizeView(params.view)
      : normalizeView(cookieStore.get(VIEW_COOKIE)?.value);

  const month = normalizeMonth(params.month);
  const week = normalizeWeek(params.week);

  const market =
    params.market !== undefined
      ? params.market.trim()
      : (cookieStore.get(MARKET_COOKIE)?.value ?? "").trim();

  const { start, end } = view === "week" ? gridRangeForWeek(week) : gridRangeForMonth(month);

  const [assemblies, marketRows, options, partnerSuggestions] = await Promise.all([
    prisma.assembly.findMany({
      where: {
        assemblyDate: { gte: start, lte: end },
        ...(market ? { market } : {}),
      },
      orderBy: [{ assemblyDate: "asc" }, { assemblyTime: "asc" }, { dealId: "asc" }],
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

  const linkedDealIds = [
    ...new Set(
      assemblies.map((assembly) => assembly.linkedDealId).filter((id): id is string => Boolean(id)),
    ),
  ];
  const linkedDeals =
    linkedDealIds.length > 0
      ? await prisma.deal.findMany({
          where: { dealId: { in: linkedDealIds } },
          include: {
            contacts: { orderBy: { sortOrder: "asc" } },
            lineItems: { include: { product: true }, orderBy: { sortOrder: "asc" } },
            client: { select: { isVip: true } },
          },
        })
      : [];
  const dealById = new Map(
    linkedDeals.map((deal) => [deal.dealId, buildLinkedDealSummary(deal)]),
  );

  const events: CalendarEvent[] = assemblies.map((assembly) => ({
    id: assembly.id,
    dateKey: assembly.assemblyDate ? londonDateKey(assembly.assemblyDate) : null,
    submitted: assembly.submissions.some((s) => s.status === "SUBMITTED"),
    values: toAssemblyFormValues(assembly),
    deal: assembly.linkedDealId ? dealById.get(assembly.linkedDealId) : undefined,
  }));

  return (
    <AssemblyCalendar
      events={events}
      view={view}
      month={month}
      week={week}
      market={market}
      markets={markets}
      deliveryCompanies={partnerSuggestions.deliveryCompanies}
      installCompanies={partnerSuggestions.installCompanies}
      options={options}
    />
  );
}
