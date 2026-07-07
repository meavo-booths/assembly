"use client";

import { useState } from "react";
import {
  ScheduleAssemblyForm,
  type AssemblyFormValues,
} from "@/components/schedule-assembly-form";
import type { LinkedDealSummary } from "@/components/linked-deal-card";
import type { SheetDropdownOptions } from "@/lib/assembly-schedule";

/**
 * Shared create-assembly modal used by the assemblies page ("New assembly")
 * and the Ready deals / deal detail pages ("Schedule assembly").
 */
export function ScheduleAssemblyModal({
  trigger,
  title,
  subtitle,
  options,
  markets,
  deliveryCompanies,
  installCompanies,
  values,
  deal,
  dealLocked = false,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  subtitle: string;
  options: SheetDropdownOptions;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
  values?: AssemblyFormValues;
  deal?: LinkedDealSummary;
  /** When true the Deal ID field is read-only (opened from a deal card). */
  dealLocked?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger(() => setOpen(true))}

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
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-600">{subtitle}</p>
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
              values={values}
              deal={deal}
              dealLocked={dealLocked}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
