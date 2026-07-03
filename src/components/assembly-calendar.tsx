"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { buildMarketColorMap, marketStyle, type MarketStyle } from "@/lib/assembly-markets";
import { Button } from "@/components/ui";

export type CalendarEvent = {
  id: string;
  dateKey: string | null;
  submitted: boolean;
  values: AssemblyFormValues;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function buildMonthGrid(month: string): Date[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    days.push(day);
  }
  return days;
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function AssemblyCalendar({
  events,
  month,
  market,
  markets,
  deliveryCompanies,
  installCompanies,
  options,
}: {
  events: CalendarEvent[];
  month: string;
  market: string;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
  options: SheetDropdownOptions;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [dayKey, setDayKey] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const colorMap = useMemo(() => buildMarketColorMap(markets), [markets]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.dateKey) continue;
      const list = map.get(event.dateKey) ?? [];
      list.push(event);
      map.set(event.dateKey, list);
    }
    return map;
  }, [events]);

  const [year, monthNumber] = month.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[monthNumber - 1]} ${year}`;
  const todayKey = dateKeyOf(new Date(Date.UTC(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  )));

  function navigate(nextMonth: string, nextMarket: string) {
    const params = new URLSearchParams();
    params.set("month", nextMonth);
    if (nextMarket) params.set("market", nextMarket);
    router.push(`/calendar?${params.toString()}`);
  }

  function changeMarket(value: string) {
    if (value) {
      document.cookie = `calendar_market=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } else {
      document.cookie = "calendar_market=; path=/; max-age=0";
    }
    navigate(month, value);
  }

  function openEvent(event: CalendarEvent) {
    setDayKey(null);
    setSelected(event);
    setEditing(false);
  }

  function closeModal() {
    setSelected(null);
    setEditing(false);
  }

  const dayModalEvents = dayKey ? eventsByDay.get(dayKey) ?? [] : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => navigate(shiftMonth(month, -1), market)}>
            ‹
          </Button>
          <span className="min-w-[9rem] text-center text-base font-semibold text-slate-900">
            {monthLabel}
          </span>
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => navigate(shiftMonth(month, 1), market)}>
            ›
          </Button>
          <Button variant="ghost" className="px-3 py-1.5" onClick={() => navigate(currentMonthKey(), market)}>
            Today
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Market</span>
          <select
            value={market}
            onChange={(e) => changeMarket(e.target.value)}
            className="min-w-[10rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All markets</option>
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = dateKeyOf(day);
            const inMonth = day.getUTCMonth() === monthNumber - 1;
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 ${
                  inMonth ? "bg-white" : "bg-slate-50/60"
                }`}
              >
                <div
                  className={`mb-1 text-right text-xs ${
                    isToday
                      ? "font-semibold text-brand-700"
                      : inMonth
                        ? "text-slate-500"
                        : "text-slate-300"
                  }`}
                >
                  {day.getUTCDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventChip
                      key={event.id}
                      event={event}
                      style={marketStyle(event.values.market, colorMap)}
                      onClick={() => openEvent(event)}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setDayKey(key)}
                      className="w-full rounded px-1 py-0.5 text-left text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                    >
                      +{dayEvents.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dayKey && !selected && (
        <DayEventsModal
          dateKey={dayKey}
          events={dayModalEvents}
          colorMap={colorMap}
          onSelect={openEvent}
          onClose={() => setDayKey(null)}
        />
      )}

      {selected && (
        <EventModal
          event={selected}
          editing={editing}
          options={options}
          markets={markets}
          deliveryCompanies={deliveryCompanies}
          installCompanies={installCompanies}
          onEdit={() => setEditing(true)}
          onClose={closeModal}
          onSaved={closeModal}
        />
      )}
    </div>
  );
}

function EventChip({
  event,
  style,
  onClick,
}: {
  event: CalendarEvent;
  style: MarketStyle;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium"
      title={`${event.values.dealId} · ${event.values.clientName}`}
    >
      {event.values.dealId}
    </button>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-20 sm:p-8 sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="truncate text-sm text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DayEventsModal({
  dateKey,
  events,
  colorMap,
  onSelect,
  onClose,
}: {
  dateKey: string;
  events: CalendarEvent[];
  colorMap: Record<string, MarketStyle>;
  onSelect: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const heading = `${MONTH_NAMES[m - 1]} ${d}, ${y}`;

  return (
    <ModalShell
      title={heading}
      subtitle={`${events.length} ${events.length === 1 ? "assembly" : "assemblies"}`}
      onClose={onClose}
    >
      <ul className="mt-4 space-y-2">
        {events.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onSelect(event)}
              style={marketStyle(event.values.market, colorMap)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:brightness-95"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {event.values.dealId}
                </span>
                <span className="block truncate text-xs text-slate-600">
                  {event.values.clientName || "Unknown client"}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-slate-700">
                {event.values.market || "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

function EventModal({
  event,
  editing,
  options,
  markets,
  deliveryCompanies,
  installCompanies,
  onEdit,
  onClose,
  onSaved,
}: {
  event: CalendarEvent;
  editing: boolean;
  options: SheetDropdownOptions;
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
  onEdit: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const v = event.values;

  return (
    <ModalShell
      title={v.dealId}
      subtitle={v.clientName || "Unknown client"}
      onClose={onClose}
    >
      {editing ? (
        <div className="mt-4">
          <ScheduleAssemblyForm
            mode="edit"
            options={options}
            markets={markets}
            deliveryCompanies={deliveryCompanies}
            installCompanies={installCompanies}
            values={v}
            onSuccess={onSaved}
          />
        </div>
      ) : (
        <>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Event type" value={eventTypeLabel(v.eventType)} />
            <Detail label="Internal team" value={internalTeamLabel(v.internalTeam)} />
            <Detail label="Date" value={formatDisplayDate(v.assemblyDate)} />
            <Detail label="Market" value={v.market} />
            <Detail label="Client type" value={v.channelType} />
            <Detail label="Client email" value={v.clientEmail} />
            <Detail label="Client phone" value={v.clientPhone} />
            <Detail label="Assembly address" value={v.assemblyAddress} />
            <Detail label="Delivery company" value={v.deliveryPartnerName} />
            <Detail label="Install done by" value={v.installPartnerName} />
            <Detail label="Closure" value={v.closure ? "Yes" : "No"} />
            <Detail label="Survey" value={v.survey ? "Yes" : "No"} />
            <Detail label="Fulfilled" value={formatDisplayDate(v.fulfilledOn)} />
            <Detail label="Issue" value={issueLabel(v.issue)} />
            <Detail label="Status" value={v.status} />
            <Detail label="Priority" value={v.priority} />
            <Detail label="Issue category" value={v.issueCategories.join(", ")} />
            <Detail label="Comments" value={v.comments} />
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={onEdit}>Edit</Button>
            <Link
              href={`/assemblies/${encodeURIComponent(v.dealId)}`}
              className="text-sm text-brand-700 underline"
            >
              Open full details
            </Link>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function formatDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${pad(d)}/${pad(m)}/${y}`;
}
