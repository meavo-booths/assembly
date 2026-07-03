"use client";

import { useState } from "react";
import { refreshFromSheet } from "@/app/actions/meavo";
import { ScheduleAssemblyForm } from "@/components/schedule-assembly-form";
import type { SheetDropdownOptions } from "@/lib/assembly-schedule";
import { Button, Card } from "@/components/ui";

export function ScheduleAssemblyCard({
  options,
  markets,
  deliveryCompanies,
  installCompanies,
}: {
  options: SheetDropdownOptions;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">Schedule assembly</h2>
            <p className="text-sm text-slate-600">
              Create a new event and add it to the delivery tracker sheet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={refreshFromSheet}>
              <Button type="submit" variant="secondary">
                Refresh from sheet
              </Button>
            </form>
            <Button variant="primary" onClick={() => setOpen(true)}>
              New assembly
            </Button>
          </div>
        </div>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-20 sm:p-8 sm:pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-6xl rounded-xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New assembly</h2>
                <p className="text-sm text-slate-600">
                  Create a new event and add it to the delivery tracker sheet.
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
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
