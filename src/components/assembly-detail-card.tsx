"use client";

import { useState } from "react";
import {
  ScheduleAssemblyForm,
  type AssemblyFormValues,
} from "@/components/schedule-assembly-form";
import {
  eventTypeLabel,
  internalTeamLabel,
  issueLabel,
  type SheetDropdownOptions,
} from "@/lib/assembly-schedule";
import { Button, Card } from "@/components/ui";

function formatDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd>{value.trim() ? value : "—"}</dd>
    </div>
  );
}

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
  const [editing, setEditing] = useState(false);
  const v = values;

  if (editing) {
    return (
      <Card className="mb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-medium text-slate-900">Edit assembly</h2>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        <ScheduleAssemblyForm
          mode="edit"
          options={options}
          markets={markets}
          deliveryCompanies={deliveryCompanies}
          installCompanies={installCompanies}
          values={v}
          onSuccess={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-medium text-slate-900">Details</h2>
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Detail label="Event type" value={eventTypeLabel(v.eventType)} />
        <Detail label="Internal team" value={internalTeamLabel(v.internalTeam)} />
        <Detail label="Date" value={formatDisplayDate(v.assemblyDate)} />
        <Detail label="Market" value={v.market} />
        <Detail label="Client type" value={v.channelType} />
        <Detail label="Client email" value={v.clientEmail} />
        <Detail label="Client phone" value={v.clientPhone} />
        <Detail label="Assembly address" value={v.assemblyAddress} />
        <Detail label="Install partner" value={v.installPartnerName} />
        <Detail label="Delivery partner" value={v.deliveryPartnerName} />
        <Detail label="Closure" value={v.closure ? "Yes" : "No"} />
        <Detail label="Survey" value={v.survey ? "Yes" : "No"} />
        <Detail label="Fulfilled" value={formatDisplayDate(v.fulfilledOn)} />
        <Detail label="Issue" value={issueLabel(v.issue)} />
        <Detail label="Status" value={v.status} />
        <Detail label="Priority" value={v.priority} />
        <Detail label="Issue category" value={v.issueCategories.join(", ")} />
      </dl>
    </Card>
  );
}
