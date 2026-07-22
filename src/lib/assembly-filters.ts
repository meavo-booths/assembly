/** Business timezone for assembly dates (matches CS sheet calendar days). */
export const ASSEMBLY_TIMEZONE = "Europe/London";

export type AssemblyDatePreset = "yesterday" | "today" | "tomorrow" | "range" | "all";

export type AssemblyFilters = {
  datePreset: AssemblyDatePreset;
  rangeFrom: string | null;
  rangeTo: string | null;
  market: string | null;
  partnerId: string | null;
  search: string | null;
};

type DateParts = { year: number; month: number; day: number };

function getZonedDateParts(timeZone: string, date = new Date()): DateParts {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function partsToStoredDate(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(parts: DateParts, days: number): DateParts {
  const date = partsToStoredDate(parts);
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Calendar day in Europe/London as a UTC `@db.Date` value (`offsetDays` from today). */
export function londonAssemblyDate(offsetDays = 0): Date {
  const today = getZonedDateParts(ASSEMBLY_TIMEZONE);
  return partsToStoredDate(offsetDays === 0 ? today : addDays(today, offsetDays));
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseAssemblyFilters(searchParams: {
  date?: string;
  from?: string;
  to?: string;
  market?: string;
  partner?: string;
  q?: string;
}): AssemblyFilters {
  const market = searchParams.market?.trim() || null;
  const partnerId = searchParams.partner?.trim() || null;
  const search = searchParams.q?.trim() || null;

  let datePreset: AssemblyDatePreset =
    searchParams.date === "yesterday" ||
    searchParams.date === "today" ||
    searchParams.date === "tomorrow" ||
    searchParams.date === "range" ||
    searchParams.date === "all"
      ? searchParams.date
      : "today";

  if (search) {
    datePreset = "all";
  }

  return {
    datePreset,
    rangeFrom: searchParams.from?.trim() || null,
    rangeTo: searchParams.to?.trim() || null,
    market,
    partnerId,
    search,
  };
}

export function assemblyDateRange(filters: AssemblyFilters): { gte: Date; lte: Date } | null {
  if (filters.datePreset === "all" || filters.search) {
    return null;
  }

  const today = getZonedDateParts(ASSEMBLY_TIMEZONE);

  if (filters.datePreset === "yesterday") {
    const day = addDays(today, -1);
    const date = partsToStoredDate(day);
    return { gte: date, lte: date };
  }

  if (filters.datePreset === "today") {
    const date = partsToStoredDate(today);
    return { gte: date, lte: date };
  }

  if (filters.datePreset === "tomorrow") {
    const day = addDays(today, 1);
    const date = partsToStoredDate(day);
    return { gte: date, lte: date };
  }

  if (filters.datePreset === "range") {
    const from = parseIsoDate(filters.rangeFrom ?? undefined);
    const to = parseIsoDate(filters.rangeTo ?? undefined);
    if (!from && !to) {
      const date = partsToStoredDate(today);
      return { gte: date, lte: date };
    }
    if (from && to) return { gte: from, lte: to };
    if (from) return { gte: from, lte: from };
    return { gte: to!, lte: to! };
  }

  return null;
}

export function buildAssemblyWhere(filters: AssemblyFilters) {
  const where: {
    assemblyDate?: { gte: Date; lte: Date };
    market?: string;
    installPartnerId?: string;
    AND?: Array<{
      OR: Array<
        | { dealId: { contains: string; mode: "insensitive" } }
        | { clientName: { contains: string; mode: "insensitive" } }
      >;
    }>;
  } = {};

  const dateRange = assemblyDateRange(filters);
  if (dateRange) {
    where.assemblyDate = dateRange;
  }

  if (filters.market) {
    where.market = filters.market;
  }

  if (filters.partnerId) {
    where.installPartnerId = filters.partnerId;
  }

  if (filters.search) {
    where.AND = [
      {
        OR: [
          { dealId: { contains: filters.search, mode: "insensitive" } },
          { clientName: { contains: filters.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  return where;
}

export function formatFilterDateLabel(filters: AssemblyFilters): string {
  if (filters.datePreset === "all" || filters.search) {
    return "All time";
  }

  if (filters.datePreset === "range") {
    if (filters.rangeFrom && filters.rangeTo && filters.rangeFrom !== filters.rangeTo) {
      return `${filters.rangeFrom} – ${filters.rangeTo}`;
    }
    if (filters.rangeFrom) return filters.rangeFrom;
    if (filters.rangeTo) return filters.rangeTo;
    return "Custom range";
  }

  return filters.datePreset.charAt(0).toUpperCase() + filters.datePreset.slice(1);
}
