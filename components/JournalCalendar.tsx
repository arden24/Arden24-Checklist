"use client";

import { memo, useMemo } from "react";
import type { Trade } from "@/lib/journal";
import { canonicalRealisedPnl } from "@/lib/realised-pnl";
import JournalDayCell from "./JournalDayCell";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type JournalCalendarProps = {
  year: number;
  month: number;
  trades: Trade[];
  selectedDate: Date | null;
  onSelectDay: (date: Date) => void;
};

function getDaysInMonth(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const monFirst = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = last.getDate();

  const rows: (number | null)[][] = [];
  let row: (number | null)[] = [];
  for (let i = 0; i < monFirst; i++) row.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) {
    while (row.length < 7) row.push(null);
    rows.push(row);
  }
  return rows;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function JournalCalendarInner({
  year,
  month,
  trades,
  selectedDate,
  onSelectDay,
}: JournalCalendarProps) {
  const dayPnl = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach((t) => {
      const key = t.date;
      if (!map[key]) map[key] = 0;
      map[key] += canonicalRealisedPnl(t);
    });
    return map;
  }, [trades]);

  const grid = useMemo(
    () => getDaysInMonth(year, month),
    [year, month]
  );

  const today = new Date();
  const todayKey = dateKey(today);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="py-1 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            {wd}
          </div>
        ))}
        {grid.map((row, rowIdx) =>
          row.map((day, colIdx) => {
            if (day === null) {
              return (
                <JournalDayCell
                  key={`e-${rowIdx}-${colIdx}`}
                  day={null}
                  pnl={null}
                  isSelected={false}
                  isCurrentMonth={true}
                  isToday={false}
                  onClick={() => {}}
                />
              );
            }
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const pnl = dayPnl[key] ?? null;
            const date = new Date(year, month, day);
            const isSelected =
              selectedDate != null &&
              dateKey(selectedDate) === dateKey(date);
            const isToday = key === todayKey;

            return (
              <JournalDayCell
                key={key}
                day={day}
                pnl={pnl}
                isSelected={isSelected}
                isCurrentMonth={true}
                isToday={isToday}
                onClick={() => onSelectDay(date)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default memo(JournalCalendarInner);
