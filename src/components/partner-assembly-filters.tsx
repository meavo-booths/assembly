"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui";

export type PartnerAssemblyView = "upcoming" | "yesterday" | "all";

const VIEW_OPTIONS: { id: PartnerAssemblyView; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "yesterday", label: "Yesterday" },
  { id: "all", label: "All" },
];

function buildHref(slug: string, view: PartnerAssemblyView, search: string | null): string {
  const params = new URLSearchParams();
  if (view === "yesterday") params.set("view", "yesterday");
  if (view === "all") params.set("view", "all");
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/${slug}?${query}` : `/${slug}`;
}

export function PartnerAssemblyFilters({
  slug,
  view,
  search,
}: {
  slug: string;
  view: PartnerAssemblyView;
  search: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(search ?? "");

  useEffect(() => {
    setQuery(search ?? "");
  }, [search]);

  function selectView(next: PartnerAssemblyView) {
    startTransition(() => {
      // Clear search when changing view so pills stay predictable.
      router.push(buildHref(slug, next, null));
    });
  }

  function applySearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    startTransition(() => {
      if (!trimmed) {
        router.push(buildHref(slug, view, null));
        return;
      }
      // Searching spans all dates (same as staff list).
      router.push(buildHref(slug, "all", trimmed));
    });
  }

  const activeView = search ? "all" : view;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {VIEW_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={activeView === option.id ? "primary" : "secondary"}
            className="px-3 py-1.5"
            onClick={() => selectView(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <form onSubmit={applySearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assembly ID, deal ID, or client"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          aria-label="Search assemblies"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
    </div>
  );
}
