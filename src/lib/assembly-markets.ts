/**
 * Colour assignment for markets (countries) on the calendar. Uses the six
 * Gateway team-creation pastels plus six similar tones (12 total), assigned by
 * the market's position in the sorted list of distinct markets so each market
 * gets a stable, visually distinct colour.
 */

export type MarketStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

const TEXT_COLOR = "#334155"; // slate-700
const BORDER_COLOR = "rgba(15, 23, 42, 0.14)";

// First 6 match Gateway's TEAM_COLORS; last 6 are similar pastels.
const PALETTE = [
  "#EEDCDC", // blush pink
  "#F4E3B1", // pale yellow
  "#E1E9EC", // pale blue-grey
  "#DCE4D7", // pale green
  "#E6E0EC", // pale purple
  "#E4E0DA", // pale taupe
  "#F3D2C1", // peach
  "#CFE3E6", // pale cyan
  "#D9E2F3", // periwinkle
  "#E9D9C0", // sand
  "#DCEAD0", // pale lime
  "#EAD5E4", // pale magenta
];

export const FALLBACK_MARKET_STYLE: MarketStyle = {
  backgroundColor: "#E5E7EB", // slate-200
  color: TEXT_COLOR,
  borderColor: BORDER_COLOR,
};

/** Build a market -> colour map from the (unsorted) list of market names. */
export function buildMarketColorMap(markets: string[]): Record<string, MarketStyle> {
  const unique = Array.from(
    new Set(markets.map((m) => m.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const map: Record<string, MarketStyle> = {};
  unique.forEach((market, index) => {
    map[market.toLowerCase()] = {
      backgroundColor: PALETTE[index % PALETTE.length],
      color: TEXT_COLOR,
      borderColor: BORDER_COLOR,
    };
  });
  return map;
}

export function marketStyle(
  market: string,
  map: Record<string, MarketStyle>,
): MarketStyle {
  const key = market.trim().toLowerCase();
  return (key && map[key]) || FALLBACK_MARKET_STYLE;
}
