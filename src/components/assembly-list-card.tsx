import { ReactNode } from "react";
import {
  eventTypeLabel,
  internalTeamLabel,
  issueLabel,
} from "@/lib/assembly-schedule";
import { Card } from "@/components/ui";

export type AssemblyListCardProps = {
  dealId: string;
  clientName: string;
  channelType: string;
  assemblyDate: Date | null;
  market: string;
  installPartnerName: string;
  deliveryPartnerName: string;
  submitted: boolean;
  eventType?: string;
  internalTeam?: string;
  issue?: string;
  status?: string | null;
  priority?: string | null;
  closure?: boolean;
  survey?: boolean;
  fulfilledOn?: Date | null;
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function issueChipClass(issue: string): string {
  if (issue === "YES") return "bg-red-100 text-red-800";
  if (issue === "NO") return "bg-green-100 text-green-800";
  return "bg-amber-100 text-amber-900";
}

export function AssemblyListCard({
  dealId,
  clientName,
  channelType,
  assemblyDate,
  market,
  installPartnerName,
  deliveryPartnerName,
  submitted,
  eventType,
  internalTeam,
  issue,
  status,
  priority,
  closure,
  survey,
  fulfilledOn,
}: AssemblyListCardProps) {
  const showInternal = internalTeam && internalTeam !== "NO";

  return (
    <Card className="!p-3 transition hover:border-brand-500 sm:!p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate font-medium text-slate-900">{dealId}</p>
          {eventType && (
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {eventTypeLabel(eventType)}
            </span>
          )}
        </div>
        <span
          className={
            submitted
              ? "shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
              : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          }
        >
          {submitted ? "Completed" : "Not completed"}
        </span>
      </div>

      <p className="mt-0.5 truncate text-sm text-slate-600">{clientName || "Unknown client"}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <MetaChip>{formatDate(assemblyDate)}</MetaChip>
        {market ? <MetaChip>{market}</MetaChip> : null}
        {channelType ? <MetaChip>{channelType}</MetaChip> : null}
        {showInternal ? <MetaChip>Internal: {internalTeamLabel(internalTeam)}</MetaChip> : null}
        {issue ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${issueChipClass(issue)}`}>
            Issue: {issueLabel(issue)}
          </span>
        ) : null}
        {status ? <MetaChip>Status: {status}</MetaChip> : null}
        {priority ? <MetaChip>Priority: {priority}</MetaChip> : null}
        {closure ? <MetaChip>Closure ✓</MetaChip> : null}
        {survey ? <MetaChip>Survey ✓</MetaChip> : null}
        {fulfilledOn ? <MetaChip>Fulfilled {formatDate(fulfilledOn)}</MetaChip> : null}
        {installPartnerName ? <MetaChip>Install: {installPartnerName}</MetaChip> : null}
        {deliveryPartnerName ? <MetaChip>Delivery: {deliveryPartnerName}</MetaChip> : null}
      </div>
    </Card>
  );
}
