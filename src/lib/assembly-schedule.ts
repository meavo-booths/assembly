/**
 * Option sets and helpers for scheduling/editing assemblies. Kept independent
 * of the generated Prisma client so it can be imported from client components.
 */

export type EventTypeValue = "ASSEMBLY" | "REPAIR" | "MOVING_SERVICE" | "AFTERCARE" | "INFO";

export const EVENT_TYPE_OPTIONS: { value: EventTypeValue; label: string }[] = [
  { value: "ASSEMBLY", label: "Assembly" },
  { value: "REPAIR", label: "Repair" },
  { value: "MOVING_SERVICE", label: "Moving Service" },
  { value: "AFTERCARE", label: "Aftercare" },
  { value: "INFO", label: "Info" },
];

export const DEFAULT_EVENT_TYPE: EventTypeValue = "ASSEMBLY";

export type InternalTeamValue = "NO" | "LAT";

export const INTERNAL_TEAM_OPTIONS: { value: InternalTeamValue; label: string }[] = [
  { value: "NO", label: "No" },
  { value: "LAT", label: "LAT" },
];

export const DEFAULT_INTERNAL_TEAM: InternalTeamValue = "NO";

export type IssueValue = "PENDING" | "YES" | "NO";

export const ISSUE_OPTIONS: { value: IssueValue; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

export const DEFAULT_ISSUE: IssueValue = "PENDING";

export const CLIENT_TYPE_OPTIONS = [
  "Direct",
  "Agency",
  "CoWorking",
  "Showroom",
  "Other",
] as const;

export type ClientTypeValue = (typeof CLIENT_TYPE_OPTIONS)[number];

const EVENT_TYPE_LABELS = new Map(EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const INTERNAL_TEAM_LABELS = new Map(INTERNAL_TEAM_OPTIONS.map((o) => [o.value, o.label]));
const ISSUE_LABELS = new Map(ISSUE_OPTIONS.map((o) => [o.value, o.label]));

export function eventTypeLabel(value: string | null | undefined): string {
  return (value && EVENT_TYPE_LABELS.get(value as EventTypeValue)) || "Assembly";
}

export function internalTeamLabel(value: string | null | undefined): string {
  return (value && INTERNAL_TEAM_LABELS.get(value as InternalTeamValue)) || "No";
}

export function issueLabel(value: string | null | undefined): string {
  return (value && ISSUE_LABELS.get(value as IssueValue)) || "Pending";
}

export function parseEventType(value: unknown): EventTypeValue {
  const v = String(value ?? "").trim().toUpperCase();
  return EVENT_TYPE_OPTIONS.some((o) => o.value === v) ? (v as EventTypeValue) : DEFAULT_EVENT_TYPE;
}

export function parseInternalTeam(value: unknown): InternalTeamValue {
  const v = String(value ?? "").trim().toUpperCase();
  return INTERNAL_TEAM_OPTIONS.some((o) => o.value === v) ? (v as InternalTeamValue) : DEFAULT_INTERNAL_TEAM;
}

export function parseIssue(value: unknown): IssueValue {
  const v = String(value ?? "").trim().toUpperCase();
  return ISSUE_OPTIONS.some((o) => o.value === v) ? (v as IssueValue) : DEFAULT_ISSUE;
}

/** Convert the stored issue enum to the label written into the sheet (col K). */
export function issueToSheet(value: string | null | undefined): string {
  return issueLabel(value);
}

/** Parse a sheet issue cell (col K) back to the stored enum. */
export function issueFromSheet(value: unknown): IssueValue {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "yes") return "YES";
  if (v === "no") return "NO";
  return "PENDING";
}

/** Options for the sheet-driven dropdowns (Status/Priority/Issue category). */
export type SheetDropdownOptions = {
  status: string[];
  priority: string[];
  issueCategory: string[];
};

export const EMPTY_SHEET_DROPDOWN_OPTIONS: SheetDropdownOptions = {
  status: [],
  priority: [],
  issueCategory: [],
};
