import type { Assembly } from "@prisma/client";
import type { AssemblyFormValues } from "@/components/schedule-assembly-form";

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
    assemblyDate: toIsoDate(a.assemblyDate),
    assemblyTime: a.assemblyTime ?? "",
    market: a.market,
    clientName: a.clientName,
    channelType: a.channelType,
    eventType: a.eventType,
    internalTeam: a.internalTeam,
    clientEmail: a.clientEmail ?? "",
    clientPhone: a.clientPhone ?? "",
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
