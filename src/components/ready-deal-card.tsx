"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ScheduleAssemblyForm,
  type AssemblyFormValues,
} from "@/components/schedule-assembly-form";
import type { LinkedDealSummary } from "@/components/linked-deal-card";
import type { SheetDropdownOptions } from "@/lib/assembly-schedule";
import { Button, Card } from "@/components/ui";

export type LinkedAssemblySummary = {
  dealId: string;
  eventType: string;
  assemblyDate: string;
  closure: boolean;
};

/** "Schedule assembly" button that opens the deal-connected create modal. */
export function ScheduleAssemblyButton({
  deal,
  prefill,
  options,
  markets,
  deliveryCompanies,
  installCompanies,
}: {
  deal: LinkedDealSummary;
  prefill: AssemblyFormValues;
  options: SheetDropdownOptions;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Schedule assembly
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16 sm:p-8 sm:pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-6xl rounded-xl bg-slate-50 p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Schedule assembly for {deal.dealId}
                </h2>
                <p className="text-sm text-slate-600">
                  Creates a new event, adds it to the delivery tracker sheet, and links it
                  to this deal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ScheduleAssemblyForm
              mode="create"
              options={options}
              markets={markets}
              deliveryCompanies={deliveryCompanies}
              installCompanies={installCompanies}
              values={prefill}
              deal={deal}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function ReadyDealCard({
  deal,
  linkedAssemblies,
  prefill,
  options,
  markets,
  deliveryCompanies,
  installCompanies,
}: {
  deal: LinkedDealSummary;
  linkedAssemblies: LinkedAssemblySummary[];
  prefill: AssemblyFormValues;
  options: SheetDropdownOptions;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
}) {
  const activeAssembly = linkedAssemblies.find((assembly) => !assembly.closure);
  const dealHref = `/deals/${encodeURIComponent(deal.dealId)}`;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={dealHref} className="font-semibold text-brand-700 hover:underline">
              {deal.dealId}
            </Link>
            <span className="text-sm text-slate-500">{deal.quoteNumber}</span>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Ready to assemble
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {deal.paymentStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {deal.clientName}
            {deal.market && ` · ${deal.market}`}
            {deal.boothSummary && ` · ${deal.boothSummary}`}
          </p>
          {deal.assemblyAddress && (
            <p className="mt-1 text-xs text-slate-500">{deal.assemblyAddress}</p>
          )}
          {linkedAssemblies.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {linkedAssemblies.map((assembly) => (
                <li key={assembly.dealId}>
                  <Link
                    href={`/assemblies/${encodeURIComponent(assembly.dealId)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {assembly.eventType}: {assembly.dealId}
                    {assembly.assemblyDate && ` · ${assembly.assemblyDate}`}
                    {!assembly.closure && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                        Active
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {activeAssembly ? (
          <div className="text-right">
            <Link
              href={`/assemblies/${encodeURIComponent(activeAssembly.dealId)}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open active assembly
            </Link>
            <p className="mt-1 max-w-[16rem] text-xs text-slate-500">
              Close {activeAssembly.dealId} (Closure tickbox) to schedule another one.
            </p>
          </div>
        ) : (
          <ScheduleAssemblyButton
            deal={deal}
            prefill={prefill}
            options={options}
            markets={markets}
            deliveryCompanies={deliveryCompanies}
            installCompanies={installCompanies}
          />
        )}
      </div>
    </Card>
  );
}
