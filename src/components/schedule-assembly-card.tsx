"use client";

import { refreshFromSheet } from "@/app/actions/meavo";
import { ScheduleAssemblyModal } from "@/components/schedule-assembly-modal";
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
            <ScheduleAssemblyModal
              trigger={(openModal) => (
                <Button variant="primary" onClick={openModal}>
                  New assembly
                </Button>
              )}
              title="New assembly"
              subtitle="Create a new event and add it to the delivery tracker sheet."
              options={options}
              markets={markets}
              deliveryCompanies={deliveryCompanies}
              installCompanies={installCompanies}
            />
          </div>
        </div>
      </Card>
    </>
  );
}
