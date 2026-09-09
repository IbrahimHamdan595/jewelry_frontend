import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { TodayInBeirut } from "@/components/shared/TodayInBeirut";

describe("TodayInBeirut", () => {
  afterEach(() => vi.useRealTimers());

  it("renders no clock-dependent text on the server, only a stable-width placeholder", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T22:30:00Z"));
    const html = renderToString(<TodayInBeirut className="text-xs" />);
    expect(html).not.toMatch(/Sep|Wed|Thu|09|10/);
    expect(html).toMatch(/min-w-/); // reserves the width so the header does not jump
  });

  it("shows the Beirut date after mount, whatever the viewer's zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T22:30:00Z")); // Thu 10 Sep in Beirut, Wed 09 in UTC
    render(<TodayInBeirut className="text-xs" />);
    expect(screen.getByText(/Thu 10 Sep/)).toBeInTheDocument();
  });
});
