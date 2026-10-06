import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarFilter, calendarParams, type CalendarValue } from "@/components/admin/CalendarFilter";
import { LanguageProvider } from "@/context/LanguageContext";
import { today } from "@/lib/utils";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

function Harness({ onChange, initial }: { onChange: (v: CalendarValue) => void; initial?: CalendarValue }) {
  const [value, setValue] = useState<CalendarValue>(initial ?? { granularity: "", date: "" });
  return <CalendarFilter value={value} onChange={(v) => { setValue(v); onChange(v); }} />;
}
function renderFilter(lang: "en" | "ar", initial?: CalendarValue) {
  const onChange = vi.fn();
  const view = render(<LanguageProvider initialLang={lang}><Harness onChange={onChange} initial={initial} /></LanguageProvider>);
  return { ...view, onChange };
}
/** Everything a user reads or hears: text plus aria-label / title / placeholder. */
const uiStrings = (root: HTMLElement) => [
  ...Array.from(root.querySelectorAll("button")).map((b) => b.textContent ?? ""),
  ...Array.from(root.querySelectorAll("*")).flatMap((el) => ["aria-label", "title", "placeholder"].map((a) => el.getAttribute(a) ?? "")),
].filter(Boolean);

describe("CalendarFilter (NEX-64)", () => {
  it("Arabic: the four ranges are named in Arabic, with no English left", () => {
    const { container } = renderFilter("ar");
    const c = ar.calendar;
    for (const name of [c.allTime, c.granularity.day, c.granularity.month, c.granularity.year]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(uiStrings(container).filter((s) => /[A-Za-z]/.test(s))).toEqual([]);
  });

  it.each(["day", "month", "year"] as const)("Arabic: the %s picker is named for a screen reader", (granularity) => {
    const { container } = renderFilter("ar", { granularity, date: "2026-09-08" });
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toHaveAccessibleName(ar.calendar.granularity[granularity]);
    expect(uiStrings(container).filter((s) => /[A-Za-z]/.test(s))).toEqual([]);
  });

  it("keeps the English wording it had", () => {
    renderFilter("en");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["All time", "day", "month", "year"]);
    expect(en.calendar.allTime).toBe("All time");
  });

  it("still filters as it did: a range anchors on today, each picker sends a date inside its bucket, All time clears", () => {
    const { container, onChange } = renderFilter("ar");
    const c = ar.calendar;
    const input = () => container.querySelector("input") as HTMLInputElement;

    fireEvent.click(screen.getByRole("button", { name: c.granularity.day }));
    expect(onChange).toHaveBeenLastCalledWith({ granularity: "day", date: today() });
    expect(input()).toHaveAttribute("type", "date");
    fireEvent.change(input(), { target: { value: "2026-09-05" } });
    expect(onChange).toHaveBeenLastCalledWith({ granularity: "day", date: "2026-09-05" });

    fireEvent.click(screen.getByRole("button", { name: c.granularity.month }));
    expect(input()).toHaveAttribute("type", "month");
    expect(input()).toHaveValue("2026-09");
    fireEvent.change(input(), { target: { value: "2026-08" } });
    expect(onChange).toHaveBeenLastCalledWith({ granularity: "month", date: "2026-08-01" });
    expect(calendarParams({ granularity: "month", date: "2026-08-01" })).toEqual({ granularity: "month", date: "2026-08-01" });

    fireEvent.click(screen.getByRole("button", { name: c.granularity.year }));
    expect(input()).toHaveValue(2026);
    fireEvent.change(input(), { target: { value: "2025" } });
    expect(onChange).toHaveBeenLastCalledWith({ granularity: "year", date: "2025-01-01" });

    fireEvent.click(screen.getByRole("button", { name: c.allTime }));
    expect(onChange).toHaveBeenLastCalledWith({ granularity: "", date: "" });
    expect(container.querySelector("input")).toBeNull();
    expect(calendarParams({ granularity: "", date: "" })).toEqual({});
  });
});
