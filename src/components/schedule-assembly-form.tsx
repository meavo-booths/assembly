"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createAssembly, updateAssembly } from "@/app/actions/assemblies";
import {
  CLIENT_TYPE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  INTERNAL_TEAM_OPTIONS,
  ISSUE_OPTIONS,
  type EventTypeValue,
  type InternalTeamValue,
  type IssueValue,
  type SheetDropdownOptions,
} from "@/lib/assembly-schedule";
import { Button } from "@/components/ui";

/** Maximum number of issue categories (sheet columns O–S). */
const MAX_ISSUE_CATEGORIES = 5;

export type AssemblyFormValues = {
  id?: string;
  dealId: string;
  assemblyDate: string;
  assemblyTime: string;
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
  issueCategories: string[];
  comments: string;
};

export function emptyAssemblyFormValues(): AssemblyFormValues {
  return {
    dealId: "",
    assemblyDate: "",
    assemblyTime: "",
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
    issueCategories: [],
    comments: "",
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

/** Controlled single issue-category picker; always submits as `issueCategory`. */
function CategorySelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) {
    return (
      <input
        name="issueCategory"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    );
  }

  const hasCurrent = !value || options.includes(value);
  return (
    <select
      name="issueCategory"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">—</option>
      {!hasCurrent && <option value={value}>{value}</option>}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

/** Repeating issue-category rows (max 5 -> sheet columns O–S). */
function IssueCategories({ options, initial }: { options: string[]; initial: string[] }) {
  const [values, setValues] = useState<string[]>(initial.length > 0 ? initial : [""]);

  const update = (index: number, next: string) =>
    setValues((prev) => prev.map((value, i) => (i === index ? next : value)));
  const add = () =>
    setValues((prev) => (prev.length >= MAX_ISSUE_CATEGORIES ? prev : [...prev, ""]));
  const remove = (index: number) =>
    setValues((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">Issue category</span>
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <CategorySelect
              options={options}
              value={value}
              onChange={(next) => update(index, next)}
            />
          </div>
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Remove issue category"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {values.length < MAX_ISSUE_CATEGORIES && (
        <button
          type="button"
          onClick={add}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          + Add more issues
        </button>
      )}
    </div>
  );
}

export function ScheduleAssemblyForm({
  mode,
  options,
  markets = [],
  deliveryCompanies = [],
  installCompanies = [],
  values,
  onSuccess,
}: {
  mode: "create" | "edit";
  options: SheetDropdownOptions;
  markets?: string[];
  deliveryCompanies?: string[];
  installCompanies?: string[];
  values?: AssemblyFormValues;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const initial = values ?? emptyAssemblyFormValues();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const marketListId = `${formId}-markets`;
  const deliveryListId = `${formId}-delivery`;
  const installListId = `${formId}-install`;
  const hasLegacyClientType =
    Boolean(initial.channelType) &&
    !CLIENT_TYPE_OPTIONS.includes(initial.channelType as (typeof CLIENT_TYPE_OPTIONS)[number]);

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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
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
        </div>

        <div className="space-y-4">
          <Field label="Client type">
            <select name="channelType" defaultValue={initial.channelType} className={inputClass}>
              <option value="">—</option>
              {hasLegacyClientType && (
                <option value={initial.channelType}>{initial.channelType}</option>
              )}
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Delivery company">
            <input
              name="deliveryPartnerName"
              list={deliveryListId}
              defaultValue={initial.deliveryPartnerName}
              className={inputClass}
            />
            <datalist id={deliveryListId}>
              {deliveryCompanies.map((company) => (
                <option key={company} value={company} />
              ))}
            </datalist>
          </Field>
          <Field label="Install done by">
            <input
              name="installPartnerName"
              list={installListId}
              defaultValue={initial.installPartnerName}
              className={inputClass}
            />
            <datalist id={installListId}>
              {installCompanies.map((company) => (
                <option key={company} value={company} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="space-y-4 lg:row-span-2">
          <Field label="Assembly date">
            <input
              type="date"
              name="assemblyDate"
              defaultValue={initial.assemblyDate}
              className={inputClass}
            />
          </Field>
          <Field label="Assembly time (London)">
            <input
              type="time"
              name="assemblyTime"
              defaultValue={initial.assemblyTime}
              className={inputClass}
            />
          </Field>
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
          </div>
          <Field label="Fulfilled date">
            <input
              type="date"
              name="fulfilledOn"
              defaultValue={initial.fulfilledOn}
              className={inputClass}
            />
          </Field>
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
          <IssueCategories options={options.issueCategory} initial={initial.issueCategories} />
        </div>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3 lg:col-span-2">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Client details
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <Field label="Client name">
                <input name="clientName" required defaultValue={initial.clientName} className={inputClass} />
              </Field>
              <Field label="Client phone number">
                <input name="clientPhone" defaultValue={initial.clientPhone} className={inputClass} />
              </Field>
              <Field label="Client email">
                <input
                  type="email"
                  name="clientEmail"
                  defaultValue={initial.clientEmail}
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="flex flex-col space-y-1 text-sm">
              <span className="font-medium text-slate-700">Assembly address</span>
              <textarea
                name="assemblyAddress"
                rows={5}
                defaultValue={initial.assemblyAddress}
                className={`${inputClass} min-h-[8rem] flex-1 resize-y`}
              />
            </label>
          </div>
        </fieldset>

        <div className="lg:col-span-2">
          <Field label="Comments">
            <textarea
              name="comments"
              rows={3}
              defaultValue={initial.comments}
              placeholder="Issue description and comments"
              className={`${inputClass} min-h-[5rem] resize-y`}
            />
          </Field>
        </div>
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
