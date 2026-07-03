"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createAssembly, updateAssembly } from "@/app/actions/assemblies";
import {
  EVENT_TYPE_OPTIONS,
  INTERNAL_TEAM_OPTIONS,
  ISSUE_OPTIONS,
  type EventTypeValue,
  type InternalTeamValue,
  type IssueValue,
  type SheetDropdownOptions,
} from "@/lib/assembly-schedule";
import { Button } from "@/components/ui";

export type AssemblyFormValues = {
  id?: string;
  dealId: string;
  assemblyDate: string;
  market: string;
  clientName: string;
  channelType: string;
  eventType: EventTypeValue;
  internalTeam: InternalTeamValue;
  clientEmail: string;
  clientPhone: string;
  assemblyAddress: string;
  deliveryPartnerName: string;
  installPartnerName: string;
  closure: boolean;
  survey: boolean;
  fulfilledOn: string;
  issue: IssueValue;
  status: string;
  priority: string;
  issueCategory: string;
};

export function emptyAssemblyFormValues(): AssemblyFormValues {
  return {
    dealId: "",
    assemblyDate: "",
    market: "",
    clientName: "",
    channelType: "",
    eventType: "ASSEMBLY",
    internalTeam: "NO",
    clientEmail: "",
    clientPhone: "",
    assemblyAddress: "",
    deliveryPartnerName: "",
    installPartnerName: "",
    closure: false,
    survey: false,
    fulfilledOn: "",
    issue: "PENDING",
    status: "",
    priority: "",
    issueCategory: "",
  };
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SheetDropdown({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
}) {
  if (options.length === 0) {
    return (
      <Field label={label}>
        <input name={name} defaultValue={defaultValue} className={inputClass} />
      </Field>
    );
  }

  const hasCurrent = !defaultValue || options.includes(defaultValue);
  return (
    <Field label={label}>
      <select name={name} defaultValue={defaultValue} className={inputClass}>
        <option value="">—</option>
        {!hasCurrent && <option value={defaultValue}>{defaultValue}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ScheduleAssemblyForm({
  mode,
  options,
  markets = [],
  values,
  onSuccess,
}: {
  mode: "create" | "edit";
  options: SheetDropdownOptions;
  markets?: string[];
  values?: AssemblyFormValues;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const initial = values ?? emptyAssemblyFormValues();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const marketListId = `${formId}-markets`;

  return (
    <form
      id={formId}
      className="space-y-4"
      action={async (formData) => {
        setError(null);
        setPending(true);
        const result = mode === "create"
          ? await createAssembly(formData)
          : await updateAssembly(formData);
        setPending(false);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (mode === "create") {
          (document.getElementById(formId) as HTMLFormElement | null)?.reset();
        }
        router.refresh();
        onSuccess?.();
      }}
    >
      {mode === "edit" && <input type="hidden" name="id" value={initial.id ?? ""} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event type">
          <select name="eventType" defaultValue={initial.eventType} className={inputClass}>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Internal team">
          <select name="internalTeam" defaultValue={initial.internalTeam} className={inputClass}>
            {INTERNAL_TEAM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" ? (
          <Field label="Deal ID">
            <input name="dealId" required defaultValue={initial.dealId} className={inputClass} />
          </Field>
        ) : (
          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Deal ID</span>
            <input type="hidden" name="dealId" value={initial.dealId} />
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              {initial.dealId}
            </p>
          </div>
        )}
        <Field label="Assembly date">
          <input
            type="date"
            name="assemblyDate"
            defaultValue={initial.assemblyDate}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Market / country">
          <input
            name="market"
            required
            list={marketListId}
            defaultValue={initial.market}
            className={inputClass}
          />
          <datalist id={marketListId}>
            {markets.map((market) => (
              <option key={market} value={market} />
            ))}
          </datalist>
        </Field>
        <Field label="Client type">
          <input name="channelType" defaultValue={initial.channelType} className={inputClass} />
        </Field>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Client
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <input name="clientName" required defaultValue={initial.clientName} className={inputClass} />
          </Field>
          <Field label="Client email">
            <input
              type="email"
              name="clientEmail"
              defaultValue={initial.clientEmail}
              className={inputClass}
            />
          </Field>
          <Field label="Client phone number">
            <input name="clientPhone" defaultValue={initial.clientPhone} className={inputClass} />
          </Field>
          <Field label="Assembly address">
            <input
              name="assemblyAddress"
              defaultValue={initial.assemblyAddress}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Delivery company">
          <input
            name="deliveryPartnerName"
            defaultValue={initial.deliveryPartnerName}
            className={inputClass}
          />
        </Field>
        <Field label="Install done by">
          <input
            name="installPartnerName"
            defaultValue={initial.installPartnerName}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="closure"
            defaultChecked={initial.closure}
            className="rounded border-slate-300"
          />
          Closure
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="survey"
            defaultChecked={initial.survey}
            className="rounded border-slate-300"
          />
          Survey
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <span className="font-medium">Fulfilled</span>
          <input
            type="date"
            name="fulfilledOn"
            defaultValue={initial.fulfilledOn}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Issue">
          <select name="issue" defaultValue={initial.issue} className={inputClass}>
            {ISSUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <SheetDropdown label="Status" name="status" options={options.status} defaultValue={initial.status} />
        <SheetDropdown label="Priority" name="priority" options={options.priority} defaultValue={initial.priority} />
        <SheetDropdown
          label="Issue category"
          name="issueCategory"
          options={options.issueCategory}
          defaultValue={initial.issueCategory}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? mode === "create"
              ? "Scheduling…"
              : "Saving…"
            : mode === "create"
              ? "Schedule assembly"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
