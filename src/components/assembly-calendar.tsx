"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { AssemblyFormValues } from "@/lib/assembly-form-values";
import type { LinkedDealSummary } from "@/lib/deal-summary";
import {
  eventTypeLabel,
  internalTeamLabel,
  issueLabel,
  type SheetDropdownOptions,
} from "@/lib/assembly-schedule";
import { CalendarMarketPills } from "@/components/calendar-market-pills";
import { buildMarketColorMap, marketStyle, type MarketStyle } from "@/lib/assembly-markets";
import {
  appendCalendarMarketParams,
  CALENDAR_MARKETS_COOKIE,
  serializeCalendarMarkets,
} from "@/lib/calendar-market-filter";
import {
  buildMonthGrid,
  buildWeekGrid,
  currentLondonDateKey,
  currentMonthKey,
  currentWeekKey,
  formatDayHeading,
  formatMonthLabel,
  formatTimeLabel,
  formatWeekLabel,
  parseTimeSlot,
  shiftMonth,
  shiftWeek,
  slotKey,
  weekHourLabels,
  type CalendarView,
} from "@/lib/calendar-dates";
import { Button } from "@/components/ui";

export type CalendarEvent = {
  id: string;
  dateKey: string | null;
  submitted: boolean;
  values: AssemblyFormValues;
  deal?: LinkedDealSummary;
};

// Code-split: the edit form only loads when an event is opened for editing.
const ScheduleAssemblyForm = dynamic(
  () => import("@/components/schedule-assembly-form").then((m) => m.ScheduleAssemblyForm),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading form…</p> },
);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VIEW_COOKIE = "calendar_view";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function eventChipLabel(values: AssemblyFormValues): string {
  const time = formatTimeLabel(values.assemblyTime);
  return time ? `${time} · ${values.dealId}` : values.dealId;
}

export function AssemblyCalendar({
  events,
  view,
  month,
  week,
  selectedMarkets,
  markets,
  deliveryCompanies,
  installCompanies,
  options,
}: {
  events: CalendarEvent[];
  view: CalendarView;
  month: string;
  week: string;
  selectedMarkets: string[];
  markets: string[];
  deliveryCompanies: string[];
  installCompanies: string[];
  options: SheetDropdownOptions;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [dayKey, setDayKey] = useState<string | null>(null);

  const monthGrid = useMemo(() => buildMonthGrid(month), [month]);
  const weekDays = useMemo(() => buildWeekGrid(week), [week]);
  const weekHours = useMemo(() => weekHourLabels(), []);
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

  const eventsBySlot = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.dateKey) continue;
      const hour = parseTimeSlot(event.values.assemblyTime);
      const key = slotKey(event.dateKey, hour);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const [, monthNumber] = month.split("-").map(Number);
  const monthLabel = formatMonthLabel(month);
  const weekLabel = formatWeekLabel(week);
  const todayKey = currentLondonDateKey();
  const periodLabel = view === "week" ? weekLabel : monthLabel;

  function navigate(
    nextView: CalendarView,
    nextMonth: string,
    nextWeek: string,
    nextMarkets: string[],
  ) {
    const params = new URLSearchParams();
    params.set("view", nextView);
    if (nextView === "week") {
      params.set("week", nextWeek);
    } else {
      params.set("month", nextMonth);
    }
    appendCalendarMarketParams(params, nextMarkets);
    router.push(`/calendar?${params.toString()}`);
  }

  function persistMarkets(nextMarkets: string[]) {
    if (nextMarkets.length > 0) {
      document.cookie = `${CALENDAR_MARKETS_COOKIE}=${encodeURIComponent(serializeCalendarMarkets(nextMarkets))}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } else {
      document.cookie = `${CALENDAR_MARKETS_COOKIE}=; path=/; max-age=0`;
    }
  }

  function changeView(nextView: CalendarView) {
    document.cookie = `${VIEW_COOKIE}=${nextView}; path=/; max-age=${60 * 60 * 24 * 365}`;
    navigate(nextView, month, week, selectedMarkets);
  }

  function toggleMarket(value: string) {
    const key = value.toLowerCase();
    const nextMarkets = selectedMarkets.some((market) => market.toLowerCase() === key)
      ? selectedMarkets.filter((market) => market.toLowerCase() !== key)
      : [...selectedMarkets, value];
    persistMarkets(nextMarkets);
    navigate(view, month, week, nextMarkets);
  }

  function clearMarkets() {
    persistMarkets([]);
    navigate(view, month, week, []);
  }

  function goPrev() {
    if (view === "week") {
      navigate(view, month, shiftWeek(week, -1), selectedMarkets);
    } else {
      navigate(view, shiftMonth(month, -1), week, selectedMarkets);
    }
  }

  function goNext() {
    if (view === "week") {
      navigate(view, month, shiftWeek(week, 1), selectedMarkets);
    } else {
      navigate(view, shiftMonth(month, 1), week, selectedMarkets);
    }
  }

  function goToday() {
    if (view === "week") {
      navigate(view, month, currentWeekKey(), selectedMarkets);
    } else {
      navigate(view, currentMonthKey(), week, selectedMarkets);
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => changeView("month")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                view === "month"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => changeView("week")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                view === "week"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Week
            </button>
          </div>

          <Button variant="secondary" className="px-3 py-1.5" onClick={goPrev}>
            ‹
          </Button>
          <span className="min-w-[10rem] text-center text-base font-semibold text-slate-900">
            {periodLabel}
          </span>
          <Button variant="secondary" className="px-3 py-1.5" onClick={goNext}>
            ›
          </Button>
          <Button variant="ghost" className="px-3 py-1.5" onClick={goToday}>
            Today
          </Button>
        </div>
      </div>

      <CalendarMarketPills
        markets={markets}
        selectedMarkets={selectedMarkets}
        colorMap={colorMap}
        onToggle={toggleMarket}
        onClear={clearMarkets}
      />

      {view === "month" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthGrid.map((day) => {
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
                        label={eventChipLabel(event.values)}
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
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div
            className="grid min-w-[48rem]"
            style={{
              gridTemplateColumns: "4.5rem repeat(7, minmax(0, 1fr))",
              gridTemplateRows: `auto repeat(${weekHours.length + 1}, minmax(3.5rem, auto))`,
            }}
          >
            <div className="border-b border-r border-slate-200 bg-slate-50" />
            {weekDays.map((dateKey) => {
              const [, , day] = dateKey.split("-").map(Number);
              const isToday = dateKey === todayKey;
              return (
                <div
                  key={dateKey}
                  className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-600"
                >
                  <div>{WEEKDAYS[weekDays.indexOf(dateKey)]}</div>
                  <div className={isToday ? "font-semibold text-brand-700" : "text-slate-900"}>
                    {day}
                  </div>
                </div>
              );
            })}

            <div className="border-b border-r border-slate-100 bg-slate-50 px-2 py-1 text-right text-[11px] font-medium text-slate-500">
              All day
            </div>
            {weekDays.map((dateKey) => (
              <WeekSlotCell
                key={slotKey(dateKey, null)}
                events={eventsBySlot.get(slotKey(dateKey, null)) ?? []}
                colorMap={colorMap}
                onSelect={openEvent}
              />
            ))}

            {weekHours.map((hour) => (
              <WeekHourRow
                key={hour}
                hour={hour}
                weekDays={weekDays}
                eventsBySlot={eventsBySlot}
                colorMap={colorMap}
                onSelect={openEvent}
              />
            ))}
          </div>
        </div>
      )}

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

function WeekHourRow({
  hour,
  weekDays,
  eventsBySlot,
  colorMap,
  onSelect,
}: {
  hour: number;
  weekDays: string[];
  eventsBySlot: Map<string, CalendarEvent[]>;
  colorMap: Record<string, MarketStyle>;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <>
      <div className="border-b border-r border-slate-100 bg-slate-50 px-2 py-1 text-right text-[11px] text-slate-500">
        {pad(hour)}:00
      </div>
      {weekDays.map((dateKey) => (
        <WeekSlotCell
          key={slotKey(dateKey, hour)}
          events={eventsBySlot.get(slotKey(dateKey, hour)) ?? []}
          colorMap={colorMap}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function WeekSlotCell({
  events,
  colorMap,
  onSelect,
}: {
  events: CalendarEvent[];
  colorMap: Record<string, MarketStyle>;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <div className="border-b border-r border-slate-100 p-1 align-top">
      <div className="max-h-24 space-y-1 overflow-y-auto">
        {events.map((event) => (
          <EventChip
            key={event.id}
            event={event}
            label={eventChipLabel(event.values)}
            style={marketStyle(event.values.market, colorMap)}
            onClick={() => onSelect(event)}
          />
        ))}
      </div>
    </div>
  );
}

function EventChip({
  event,
  label,
  style,
  onClick,
}: {
  event: CalendarEvent;
  label: string;
  style: MarketStyle;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium"
      title={`${label} · ${event.values.clientName}`}
    >
      {label}
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
  return (
    <ModalShell
      title={formatDayHeading(dateKey)}
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
                  {eventChipLabel(event.values)}
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
  deliveryCompanies,
  installCompanies,
  onEdit,
  onClose,
  onSaved,
}: {
  event: CalendarEvent;
  editing: boolean;
  options: SheetDropdownOptions;
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
            deal={event.deal}
            dealLocked={Boolean(v.linkedDealId)}
            onSuccess={onSaved}
          />
        </div>
      ) : (
        <>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Event type" value={eventTypeLabel(v.eventType)} />
            <Detail label="Internal team" value={internalTeamLabel(v.internalTeam)} />
            <Detail label="Date" value={formatDisplayDate(v.assemblyDate, v.assemblyTime)} />
            <Detail label="Market" value={v.market} />
            <Detail label="Client type" value={v.channelType} />
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
            <Detail label="Assembly Comments" value={v.comments} />
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

function formatDisplayDate(iso: string, time?: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const datePart = `${pad(d)}/${pad(m)}/${y}`;
  const timePart = formatTimeLabel(time);
  return timePart ? `${timePart} · ${datePart}` : datePart;
}
