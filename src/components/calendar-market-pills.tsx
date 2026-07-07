"use client";

import { marketStyle, type MarketStyle } from "@/lib/assembly-markets";

export function CalendarMarketPills({
  markets,
  selectedMarkets,
  colorMap,
  onToggle,
  onClear,
}: {
  markets: string[];
  selectedMarkets: string[];
  colorMap: Record<string, MarketStyle>;
  onToggle: (market: string) => void;
  onClear: () => void;
}) {
  if (markets.length === 0) return null;

  const selectedSet = new Set(selectedMarkets.map((market) => market.toLowerCase()));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {markets.map((market) => {
        const active = selectedSet.has(market.toLowerCase());
        const style = marketStyle(market, colorMap);
        return (
          <button
            key={market}
            type="button"
            onClick={() => onToggle(market)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              active ? "" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            style={
              active
                ? {
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    borderColor: style.borderColor,
                  }
                : undefined
            }
          >
            {market}
          </button>
        );
      })}
      {selectedMarkets.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
