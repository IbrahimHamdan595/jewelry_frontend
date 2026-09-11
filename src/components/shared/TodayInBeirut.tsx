"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useFormat } from "@/hooks/useFormat";

/**
 * Today's date, Beirut calendar, rendered only after mount.
 *
 * Reading the clock during render is what broke hydration on the POS (NEX-62):
 * the server and the browser can disagree on the day, or on how their ICU
 * spells the month. The server output here is a fixed-width blank, so the
 * first client render matches it exactly; the date appears one effect later
 * without moving anything. A minute tick keeps a till that stays open past
 * midnight on the right day.
 */
export function TodayInBeirut({ className }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  const { formatShortDate } = useFormat();

  useEffect(() => {
    const tick = () => setLabel((prev) => {
      const next = formatShortDate(new Date());
      return next === prev ? prev : next;
    });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [formatShortDate]);

  return (
    <span className={cn("inline-block min-w-[6.5rem] text-end", className)}>
      {label ?? "\u00A0"}
    </span>
  );
}
