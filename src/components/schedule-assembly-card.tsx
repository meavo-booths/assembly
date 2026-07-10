"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSheetImportStatus, refreshFromSheet } from "@/app/actions/sheet";
import { ScheduleAssemblyModal } from "@/components/schedule-assembly-modal";
import type { SheetDropdownOptions } from "@/lib/assembly-schedule";
import { Button, Card } from "@/components/ui";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

function RefreshFromSheetButton({ onError }: { onError: (message: string | null) => void }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    onError(null);
    setRefreshing(true);
    try {
      const { startedAt } = await refreshFromSheet();
      // The import runs after the action response; poll until this run lands.
      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        const status = await getSheetImportStatus();
        if (status.lastRunAt && status.lastRunAt >= startedAt) {
          if (status.errorMessage) onError(`Import finished with errors: ${status.errorMessage}`);
          router.refresh();
          return;
        }
      }
      onError("Import is taking longer than expected — reload the page to check.");
    } catch {
      onError("Could not start the sheet import. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Button type="button" variant="secondary" disabled={refreshing} onClick={handleRefresh}>
      {refreshing ? "Importing…" : "Refresh from sheet"}
    </Button>
  );
}

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
  const [refreshError, setRefreshError] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-900">Schedule assembly</h2>
          <p className="text-sm text-slate-600">
            Create a new event and add it to the delivery tracker sheet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshFromSheetButton onError={setRefreshError} />
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
      {refreshError && <p className="mt-2 text-sm text-red-600">{refreshError}</p>}
    </Card>
  );
}
