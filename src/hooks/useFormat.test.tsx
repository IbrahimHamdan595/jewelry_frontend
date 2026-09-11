import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/context/LanguageContext";
import { useFormat } from "@/hooks/useFormat";

function Probe() {
  const { formatDate, formatDateTime } = useFormat();
  return <div><span data-testid="d">{formatDate("2026-09-05T12:00:00Z")}</span><span data-testid="dt">{formatDateTime("2026-09-05T12:00:00Z")}</span></div>;
}

describe("useFormat", () => {
  it("formats dates in the current UI language", () => {
    render(<LanguageProvider initialLang="ar"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("d")).toHaveTextContent(/أيلول|سبتمبر/);
    expect(screen.getByTestId("dt")).toHaveTextContent(/أيلول|سبتمبر/);
  });
  it("is English by default", () => {
    render(<LanguageProvider initialLang="en"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("d")).toHaveTextContent(/Sep/);
  });
});
