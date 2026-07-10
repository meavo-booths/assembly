"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createAssembly, updateAssembly } from "@/app/actions/assemblies";
import type { DealForAssemblyResult } from "@/app/actions/deals";
import {
  EVENT_TYPE_OPTIONS,
  INTERNAL_TEAM_OPTIONS,
  ISSUE_OPTIONS,
  type SheetDropdownOptions,
} from "@/lib/assembly-schedule";
import { LinkedDealBoxes } from "@/components/linked-deal-card";
import type { LinkedDealSummary } from "@/lib/deal-summary";
import { DealIdSearchField } from "@/components/deal-id-search-field";
import {
  emptyAssemblyFormValues,
  type AssemblyFormValues,
} from "@/lib/assembly-form-values";
import { Button } from "@/components/ui";

export type { AssemblyFormValues };

/** Maximum number of issue categories (sheet columns O–S). */
const MAX_ISSUE_CATEGORIES = 5;

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
  deliveryCompanies = [],
  installCompanies = [],
  values,
  deal,
  dealLocked = false,
  onSuccess,
}: {
  mode: "create" | "edit";
  options: SheetDropdownOptions;
  markets?: string[];
  deliveryCompanies?: string[];
  installCompanies?: string[];
  values?: AssemblyFormValues;
  /** Initial linked deal summary (from server or deal card). */
  deal?: LinkedDealSummary;
  /** When true the Deal ID field is read-only. */
  dealLocked?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const initial = values ?? emptyAssemblyFormValues();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [assemblyId, setAssemblyId] = useState(initial.dealId);
  const [linkedDealId, setLinkedDealId] = useState(initial.linkedDealId);
  const [assemblyAddress, setAssemblyAddress] = useState(initial.assemblyAddress);
  const [market, setMarket] = useState(initial.market);
  const [channelType, setChannelType] = useState(initial.channelType);
  const [clientName, setClientName] = useState(initial.clientName);
  const [selectedDeal, setSelectedDeal] = useState<LinkedDealSummary | null>(deal ?? null);

  const deliveryListId = `${formId}-delivery`;
  const installListId = `${formId}-install`;
  const showDealBoxes = Boolean(selectedDeal?.dealId);

  const handleDealSelect = (result: DealForAssemblyResult) => {
    if (!result.summary.dealId) {
      setSelectedDeal(null);
      setMarket("");
      setChannelType("");
      setClientName("");
      return;
    }
    setSelectedDeal(result.summary);
    setLinkedDealId(result.summary.dealId);
    setAssemblyAddress(result.summary.assemblyAddress);
    setMarket(result.summary.market);
    setChannelType(result.channelType);
    setClientName(result.summary.clientName);
    if (mode === "create" && result.suggestedAssemblyId) {
      setAssemblyId(result.suggestedAssemblyId);
    }
  };

  return (
    <form
      id={formId}
      className="space-y-4"
      action={async (formData) => {
        setError(null);
        setPending(true);
        const result: { error?: string; dealId?: string } = mode === "create"
          ? await createAssembly(formData)
          : await updateAssembly(formData);
        setPending(false);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (mode === "create") {
          (document.getElementById(formId) as HTMLFormElement | null)?.reset();
          setAssemblyId("");
          setLinkedDealId("");
          setAssemblyAddress("");
          setMarket("");
          setChannelType("");
          setClientName("");
          setSelectedDeal(null);
        }
        if (mode === "edit" && result.dealId && result.dealId !== initial.dealId) {
          router.push(`/assemblies/${encodeURIComponent(result.dealId)}`);
          return;
        }
        router.refresh();
        onSuccess?.();
      }}
    >
      {mode === "edit" && <input type="hidden" name="id" value={initial.id ?? ""} />}
      <input type="hidden" name="market" value={market} />
      <input type="hidden" name="channelType" value={channelType} />
      <input type="hidden" name="clientName" value={clientName} />

      <div
        className={
          showDealBoxes
            ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            : undefined
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Column 1 — event identity */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Field label="Assembly ID">
                <input
                  name="dealId"
                  required
                  value={assemblyId}
                  onChange={(event) => setAssemblyId(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <p className="text-xs text-slate-500">
                Unique name used in the tracker sheet and links.
                {mode === "edit" && " Renaming updates the sheet row and this page's URL."}
              </p>
            </div>
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
            <Field label="Fulfilled date">
              <input
                type="date"
                name="fulfilledOn"
                defaultValue={initial.fulfilledOn}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Column 2 — deal link + partners */}
          <div className="space-y-4">
            <DealIdSearchField
              value={linkedDealId}
              onChange={setLinkedDealId}
              onDealSelect={handleDealSelect}
              readOnly={dealLocked || (mode === "edit" && Boolean(initial.linkedDealId))}
            />
            <Field label="Delivery Company">
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
            <Field label="Install Company">
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
            <div className="flex flex-wrap gap-6 pt-1">
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
          </div>

          {/* Column 3 — scheduling + status */}
          <div className="space-y-4 lg:row-span-2">
            <Field label="Assembly date">
              <input
                type="date"
                name="assemblyDate"
                required
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

          {/* Below columns 1–2 */}
          <div className="space-y-4 lg:col-span-2">
            <Field label="Assembly Comments">
              <textarea
                name="comments"
                rows={4}
                defaultValue={initial.comments}
                placeholder="Issue description and comments"
                className={`${inputClass} min-h-[6rem] resize-y`}
              />
            </Field>
            <Field label="Assembly address">
              <textarea
                name="assemblyAddress"
                rows={5}
                value={assemblyAddress}
                onChange={(event) => setAssemblyAddress(event.target.value)}
                className={`${inputClass} min-h-[8rem] resize-y`}
              />
            </Field>
          </div>
        </div>
      </div>

      {showDealBoxes && selectedDeal && (
        <LinkedDealBoxes
          deal={selectedDeal}
          dealHref={`/deals/${encodeURIComponent(selectedDeal.dealId)}`}
        />
      )}

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
