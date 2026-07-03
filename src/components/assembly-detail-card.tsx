"use client";

import { useRouter } from "next/navigation";
import {
  ScheduleAssemblyForm,
  type AssemblyFormValues,
} from "@/components/schedule-assembly-form";
import type { SheetDropdownOptions } from "@/lib/assembly-schedule";
import { Button, Card } from "@/components/ui";

export function AssemblyDetailCard({
  values,
  options,
  markets,
  deliveryCompanies,
  installCompanies,
}: {
  values: AssemblyFormValues;
  options: SheetDropdownOptions;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
}) {
  const router = useRouter();

  return (
    <Card className="mb-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-medium text-slate-900">Edit assembly</h2>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Cancel
        </Button>
      </div>
      <ScheduleAssemblyForm
        mode="edit"
        options={options}
        markets={markets}
        deliveryCompanies={deliveryCompanies}
        installCompanies={installCompanies}
        values={values}
        onSuccess={() => router.refresh()}
      />
    </Card>
  );
}
