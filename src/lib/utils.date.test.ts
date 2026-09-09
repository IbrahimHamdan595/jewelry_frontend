import { describe, it, expect, vi, afterEach } from "vitest";
import { today, firstOfMonth, firstOfYear, formatDate, formatDateTime } from "@/lib/utils";

/**
 * Everything here is asserted from a fixed UTC instant, so the answers only
 * hold if the helpers pin Asia/Beirut — in any other zone (UTC on Vercel,
 * the viewer's machine) the day flips at a different instant.
 */
const at = (iso: string) => vi.setSystemTime(new Date(iso));

describe("calendar-day helpers are Beirut days, not server-local days", () => {
  afterEach(() => vi.useRealTimers());

  it("today() flips at Beirut midnight in summer (UTC+3), both directions", () => {
    vi.useFakeTimers();
    at("2026-09-09T20:59:59Z"); // 23:59:59 in Beirut
    expect(today()).toBe("2026-09-09");
    at("2026-09-09T21:00:00Z"); // 00:00:00 next day in Beirut
    expect(today()).toBe("2026-09-10");
  });

  it("today() flips at Beirut midnight in winter (UTC+2) — DST is honoured via the IANA zone", () => {
    vi.useFakeTimers();
    at("2026-01-15T21:59:59Z");
    expect(today()).toBe("2026-01-15");
    at("2026-01-15T22:00:00Z");
    expect(today()).toBe("2026-01-16");
  });

  it("firstOfMonth() and firstOfYear() follow the Beirut calendar", () => {
    vi.useFakeTimers();
    at("2026-09-30T21:30:00Z"); // already 1 Oct in Beirut
    expect(firstOfMonth()).toBe("2026-10-01");
    at("2026-12-31T22:30:00Z"); // already 1 Jan 2027 in Beirut
    expect(firstOfYear()).toBe("2027-01-01");
  });
});

describe("display formatters pin Beirut", () => {
  it("formatDate shows the Beirut day for an instant that is still the previous day in UTC", () => {
    expect(formatDate("2026-09-09T22:30:00Z")).toMatch(/^10 Sep/);
  });

  it("formatDateTime shows Beirut wall-clock time", () => {
    expect(formatDateTime("2026-09-09T22:30:00Z")).toMatch(/^10 Sep.* 01:30$/);
    expect(formatDateTime("2026-01-15T22:30:00Z")).toMatch(/^16 Jan.* 00:30$/);
  });
});
