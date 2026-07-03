"use client";

import { useState } from "react";
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
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-900">Schedule assembly</h2>
          <p className="text-sm text-slate-600">
            Create a new event and add it to the delivery tracker sheet.
          </p>
        </div>
        <Button variant={open ? "secondary" : "primary"} onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "New assembly"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ScheduleAssemblyForm
            mode="create"
            options={options}
            markets={markets}
            deliveryCompanies={deliveryCompanies}
            installCompanies={installCompanies}
            onSuccess={() => setOpen(false)}
          />
        </div>
      )}
    </Card>
  );
}
