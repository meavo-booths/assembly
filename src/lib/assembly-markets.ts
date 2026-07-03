/**
 * Deterministic colour assignment for markets (countries) on the calendar.
 * Uses a fixed Tailwind palette so the same market always renders the same
 * colour, with a neutral fallback for blanks.
 */

export type MarketColor = {
  /** Event chip classes (background + text + border). */
  chip: string;
  /** Small legend/dot classes. */
  dot: string;
};

const PALETTE: MarketColor[] = [
  { chip: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  { chip: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  { chip: "bg-amber-100 text-amber-900 border-amber-200", dot: "bg-amber-500" },
  { chip: "bg-violet-100 text-violet-800 border-violet-200", dot: "bg-violet-500" },
  { chip: "bg-rose-100 text-rose-800 border-rose-200", dot: "bg-rose-500" },
  { chip: "bg-cyan-100 text-cyan-800 border-cyan-200", dot: "bg-cyan-500" },
  { chip: "bg-lime-100 text-lime-800 border-lime-200", dot: "bg-lime-600" },
  { chip: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200", dot: "bg-fuchsia-500" },
  { chip: "bg-orange-100 text-orange-900 border-orange-200", dot: "bg-orange-500" },
  { chip: "bg-teal-100 text-teal-800 border-teal-200", dot: "bg-teal-500" },
];

const FALLBACK: MarketColor = {
  chip: "bg-slate-100 text-slate-700 border-slate-200",
  dot: "bg-slate-400",
};

export function marketColor(market: string): MarketColor {
  const key = market.trim().toLowerCase();
  if (!key) return FALLBACK;

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
