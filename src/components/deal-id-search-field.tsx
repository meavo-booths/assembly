"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  getDealForAssemblyAction,
  searchDealsForAssemblyAction,
  type DealForAssemblyResult,
  type DealSearchHit,
} from "@/app/actions/deals";
import type { LinkedDealSummary } from "@/components/linked-deal-card";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function DealIdSearchField({
  value,
  onChange,
  onDealSelect,
  readOnly = false,
}: {
  value: string;
  onChange: (linkedDealId: string) => void;
  onDealSelect: (result: DealForAssemblyResult) => void;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [hits, setHits] = useState<DealSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchDealsForAssemblyAction(text);
        setHits(results);
        setOpen(results.length > 0);
      });
    }, 250);
  };

  const selectDeal = (dealId: string) => {
    setError(null);
    setOpen(false);
    setQuery(dealId);
    onChange(dealId);
    startTransition(async () => {
      const result = await getDealForAssemblyAction(dealId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onDealSelect(result);
    });
  };

  const clearDeal = () => {
    setQuery("");
    onChange("");
    setHits([]);
    setOpen(false);
    setError(null);
    onDealSelect({
      summary: emptyDealSummary(),
      suggestedAssemblyId: "",
      channelType: "",
    });
  };

  if (readOnly) {
    return (
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Deal ID</span>
        <input
          name="linkedDealId"
          value={value}
          readOnly
          className={`${inputClass} bg-slate-50 text-slate-700`}
        />
      </label>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Deal ID</span>
        <div className="flex gap-2">
          <input
            name="linkedDealId"
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              onChange(next);
              setError(null);
              if (next.trim().length >= 2) search(next);
              else {
                setHits([]);
                setOpen(false);
              }
            }}
            onFocus={() => {
              if (hits.length > 0) setOpen(true);
            }}
            placeholder="Search deals…"
            autoComplete="off"
            className={inputClass}
          />
          {query && (
            <button
              type="button"
              onClick={clearDeal}
              className="shrink-0 rounded-lg border border-slate-300 px-2 text-sm text-slate-500 hover:bg-slate-50"
              aria-label="Clear deal"
            >
              ✕
            </button>
          )}
        </div>
      </label>
      {open && hits.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {hits.map((hit) => (
            <li key={hit.dealId}>
              <button
                type="button"
                onClick={() => selectDeal(hit.dealId)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{hit.dealId}</span>
                <span className="ml-2 text-slate-500">{hit.clientName}</span>
                {hit.quoteNumber && (
                  <span className="ml-2 text-xs text-slate-400">{hit.quoteNumber}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && <p className="mt-1 text-xs text-slate-500">Loading deal…</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function emptyDealSummary(): LinkedDealSummary {
  return {
    dealId: "",
    quoteNumber: "",
    clientName: "",
    isVip: false,
    dealDate: "",
    salesRep: "",
    market: "",
    clientType: "",
    paymentStatus: "",
    vatNumber: "",
    registeredAddress: "",
    assemblyAddress: "",
    notes: "",
    boothSummary: "",
    contacts: [],
  };
}
