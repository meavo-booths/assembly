/** Cookie storing the user's last calendar market filter selection. */
export const CALENDAR_MARKETS_COOKIE = "calendar_markets";
/** Legacy single-market cookie — read as fallback for back-compat. */
export const CALENDAR_MARKET_COOKIE_LEGACY = "calendar_market";

function splitMarketValues(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueMarkets(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

/** Parse selected markets from URL params and/or cookie. Empty = show all. */
export function parseCalendarMarkets(
  raw: string | string[] | undefined,
  cookieValue?: string,
): string[] {
  const fromParams: string[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) fromParams.push(...splitMarketValues(entry));
  } else if (typeof raw === "string" && raw.trim()) {
    fromParams.push(...splitMarketValues(raw));
  }

  if (fromParams.length > 0) return uniqueMarkets(fromParams);

  if (cookieValue?.trim()) {
    return uniqueMarkets(splitMarketValues(cookieValue));
  }

  return [];
}

/** Serialize selected markets for cookie storage. */
export function serializeCalendarMarkets(markets: string[]): string {
  return uniqueMarkets(markets).join(",");
}

/** Append repeated `market` query params to a URLSearchParams instance. */
export function appendCalendarMarketParams(
  params: URLSearchParams,
  markets: string[],
): void {
  for (const market of uniqueMarkets(markets)) {
    params.append("market", market);
  }
}
