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
import { loadScheduleFormContext } from "@/lib/schedule-form-context";
import { getAssemblyMarkets } from "@/lib/assembly-form-suggestions";
import { toAssemblyFormValues } from "@/lib/assembly-form-values";
import { buildLinkedDealSummary } from "@/lib/deal-summary";
import { dealSummaryInclude } from "@/lib/deal-queries";
import {
  CALENDAR_MARKETS_COOKIE,
  CALENDAR_MARKET_COOKIE_LEGACY,
  parseCalendarMarkets,
} from "@/lib/calendar-market-filter";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VIEW_COOKIE = "calendar_view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string; view?: string; market?: string | string[] }>;
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

  const marketCookie =
    cookieStore.get(CALENDAR_MARKETS_COOKIE)?.value ??
    cookieStore.get(CALENDAR_MARKET_COOKIE_LEGACY)?.value;
  const selectedMarkets = parseCalendarMarkets(params.market, marketCookie);

  const { start, end } = view === "week" ? gridRangeForWeek(week) : gridRangeForMonth(month);

  const [assemblies, markets, formContext] = await Promise.all([
    prisma.assembly.findMany({
      where: {
        assemblyDate: { gte: start, lte: end },
        ...(selectedMarkets.length > 0 ? { market: { in: selectedMarkets } } : {}),
      },
      orderBy: [{ assemblyDate: "asc" }, { assemblyTime: "asc" }, { dealId: "asc" }],
      include: { submissions: { select: { status: true } } },
      take: 1000,
    }),
    getAssemblyMarkets(),
    loadScheduleFormContext(),
  ]);

  const linkedDealIds = [
    ...new Set(
      assemblies.map((assembly) => assembly.linkedDealId).filter((id): id is string => Boolean(id)),
    ),
  ];
  const linkedDeals =
    linkedDealIds.length > 0
      ? await prisma.deal.findMany({
          where: { dealId: { in: linkedDealIds } },
          include: dealSummaryInclude,
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
      selectedMarkets={selectedMarkets}
      markets={markets}
      deliveryCompanies={formContext.deliveryCompanies}
      installCompanies={formContext.installCompanies}
      options={formContext.options}
    />
  );
}
