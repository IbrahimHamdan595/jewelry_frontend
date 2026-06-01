"use client";
/**
 * Reusable calendar filter (Phase 5). Lets the user filter a list by a single
 * Beirut-local day, month, or year. Emits `{ granularity, date }` query params
 * consumed by the backend date-range helper (app/core/daterange.py): `date` is
 * always a YYYY-MM-DD anchor inside the chosen bucket.
 *
 * granularity === "" means "all" (no date filter).
 */
import { useMemo } from "react";

export type Granularity = "" | "day" | "month" | "year";

export interface CalendarValue {
  granularity: Granularity;
  date: string; // YYYY-MM-DD anchor; ignored when granularity === ""
}

const TODAY_ANCHOR = "2026-06-02"; // SSR-safe default; replaced on first user edit

function defaultAnchor(): string {
  if (typeof window === "undefined") return TODAY_ANCHOR;
  return new Date().toISOString().slice(0, 10);
}

export function CalendarFilter({
  value,
  onChange,
}: {
  value: CalendarValue;
  onChange: (v: CalendarValue) => void;
}) {
  const anchor = value.date || defaultAnchor();

  const monthValue = useMemo(() => anchor.slice(0, 7), [anchor]); // YYYY-MM
  const yearValue = useMemo(() => anchor.slice(0, 4), [anchor]); // YYYY

  function setGranularity(g: Granularity) {
    if (g === "") {
      onChange({ granularity: "", date: "" });
    } else {
      onChange({ granularity: g, date: anchor });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {(["", "day", "month", "year"] as Granularity[]).map((g) => (
          <button
            key={g || "all"}
            onClick={() => setGranularity(g)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              value.granularity === g
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {g === "" ? "All time" : g}
          </button>
        ))}
      </div>

      {value.granularity === "day" && (
        <input
          type="date"
          value={anchor}
          onChange={(e) => onChange({ granularity: "day", date: e.target.value })}
          className="border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gold"
        />
      )}
      {value.granularity === "month" && (
        <input
          type="month"
          value={monthValue}
          onChange={(e) => onChange({ granularity: "month", date: `${e.target.value}-01` })}
          className="border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gold"
        />
      )}
      {value.granularity === "year" && (
        <input
          type="number"
          min="2020"
          max="2100"
          value={yearValue}
          onChange={(e) => onChange({ granularity: "year", date: `${e.target.value}-01-01` })}
          className="border border-gray-200 rounded px-3 py-1.5 text-xs w-24 focus:outline-none focus:border-gold"
        />
      )}
    </div>
  );
}

/** Build the `?granularity=&date=` querystring fragment (empty when "all"). */
export function calendarParams(v: CalendarValue): Record<string, string> {
  if (!v.granularity || !v.date) return {};
  return { granularity: v.granularity, date: v.date };
}
