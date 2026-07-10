import type { Assembly } from "@prisma/client";
import type {
  EventTypeValue,
  InternalTeamValue,
  IssueValue,
} from "@/lib/assembly-schedule";

/**
 * Editable form value shape shared by the schedule/edit forms and the pages
 * that build prefills. Lives here (not in the "use client" form module) so
 * server code never imports from components.
 */
export type AssemblyFormValues = {
  id?: string;
  dealId: string;
  linkedDealId: string;
  assemblyDate: string;
  assemblyTime: string;
  market: string;
  clientName: string;
  channelType: string;
  eventType: EventTypeValue;
  internalTeam: InternalTeamValue;
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

/** Blank form values for the create form and deal prefills. */
export function emptyAssemblyFormValues(): AssemblyFormValues {
  return {
    dealId: "",
    linkedDealId: "",
    assemblyDate: "",
    assemblyTime: "",
    market: "",
    clientName: "",
    channelType: "",
    eventType: "ASSEMBLY",
    internalTeam: "NO",
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

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a stored @db.Date as an ISO `yyyy-mm-dd` string for date inputs. */
export function toIsoDate(date: Date | null): string {
  if (!date) return "";
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Map a Prisma Assembly row to the editable form value shape. */
export function toAssemblyFormValues(a: Assembly): AssemblyFormValues {
  return {
    id: a.id,
    dealId: a.dealId,
    linkedDealId: a.linkedDealId ?? "",
    assemblyDate: toIsoDate(a.assemblyDate),
    assemblyTime: a.assemblyTime ?? "",
    market: a.market,
    clientName: a.clientName,
    channelType: a.channelType,
    eventType: a.eventType,
    internalTeam: a.internalTeam,
    assemblyAddress: a.assemblyAddress ?? "",
    deliveryPartnerName: a.deliveryPartnerName,
    installPartnerName: a.installPartnerName,
    closure: a.closure,
    survey: a.survey,
    fulfilledOn: toIsoDate(a.fulfilledOn),
    issue: a.issue,
    status: a.status ?? "",
    priority: a.priority ?? "",
    issueCategories: a.issueCategories,
    comments: a.comments ?? "",
  };
}
