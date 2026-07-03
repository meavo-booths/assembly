"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { AssemblyDatePreset, AssemblyFilters } from "@/lib/assembly-filters";
import { Button } from "@/components/ui";

const DATE_PRESETS: { id: AssemblyDatePreset; label: string }[] = [
  { id: "yesterday", label: "Yesterday" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "all", label: "All time" },
];

export function AssemblyFilters({
  filters,
  markets,
  partners,
}: {
  filters: AssemblyFilters;
  markets: string[];
  partners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [rangeOpen, setRangeOpen] = useState(
    filters.datePreset === "range" && Boolean(filters.rangeFrom || filters.rangeTo),
  );
  const [rangeFrom, setRangeFrom] = useState(filters.rangeFrom ?? "");
  const [rangeTo, setRangeTo] = useState(filters.rangeTo ?? "");
  const [search, setSearch] = useState(filters.search ?? "");

  useEffect(() => {
    setSearch(filters.search ?? "");
  }, [filters.search]);

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/?${query}` : "/");
    });
  }

  function selectPreset(preset: AssemblyDatePreset) {
    setRangeOpen(false);
    setSearch("");
    pushParams({ date: preset, from: null, to: null, q: null });
  }

  function openRangePicker() {
    setRangeOpen((open) => !open);
    if (filters.datePreset !== "range") {
      setRangeFrom("");
      setRangeTo("");
    }
  }

  function applyRange() {
    if (!rangeFrom && !rangeTo) return;
    setSearch("");
    pushParams({
      date: "range",
      from: rangeFrom || null,
      to: rangeTo || rangeFrom || null,
      q: null,
    });
  }

  function selectMarket(market: string) {
    pushParams({ market: market || null });
  }

  function selectPartner(partnerId: string) {
    pushParams({ partner: partnerId || null });
  }

  function applySearch() {
    const trimmed = search.trim();
    if (!trimmed) {
      pushParams({ q: null });
      return;
    }
    setRangeOpen(false);
    pushParams({ q: trimmed, date: "all", from: null, to: null });
  }

  function clearSearch() {
    setSearch("");
    pushParams({ q: null, date: "today", from: null, to: null });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-700">Date</span>
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={filters.datePreset === preset.id ? "primary" : "secondary"}
            className="px-3 py-1.5"
            onClick={() => selectPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          variant={filters.datePreset === "range" ? "primary" : "secondary"}
          className="px-2 py-1.5"
          onClick={openRangePicker}
          aria-expanded={rangeOpen}
          aria-label="Date range"
          title="Date range"
        >
          <CalendarIcon />
        </Button>
      </div>

      {rangeOpen && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">From</span>
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="block rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">To</span>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="block rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <Button type="button" onClick={applyRange} disabled={!rangeFrom && !rangeTo}>
            Apply range
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span className="shrink-0 font-medium text-slate-700">Market</span>
          <select
            value={filters.market ?? ""}
            onChange={(e) => selectMarket(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All markets</option>
            {markets.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span className="shrink-0 font-medium text-slate-700">Partner</span>
          <select
            value={filters.partnerId ?? ""}
            onChange={(e) => selectPartner(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All partners</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch();
        }}
      >
        <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
          <span className="font-medium text-slate-700">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Deal ID or client name"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <Button type="submit">Search</Button>
        {filters.search ? (
          <Button type="button" variant="secondary" onClick={clearSearch}>
            Clear
          </Button>
        ) : null}
      </form>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
