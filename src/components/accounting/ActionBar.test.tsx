import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionBar } from "@/components/accounting/ActionBar";
import { LanguageProvider } from "@/context/LanguageContext";

describe("ActionBar hint (NEX-64)", () => {
  it("keeps the hint arrow as it was in English", () => {
    render(<ActionBar hint="pays off oldest invoices first"><button>Go</button></ActionBar>);
    expect(screen.getByText("↳ pays off oldest invoices first")).toBeInTheDocument();
  });

  it("points the hint arrow the reading way in Arabic", () => {
    render(<LanguageProvider initialLang="ar"><ActionBar hint="يسدّد أقدم الفواتير أولاً"><button>x</button></ActionBar></LanguageProvider>);
    expect(screen.getByText("↲ يسدّد أقدم الفواتير أولاً")).toBeInTheDocument();
  });

  it("renders no hint when none is given", () => {
    const { container } = render(<ActionBar><button>Go</button></ActionBar>);
    expect(container.textContent).toBe("Go");
  });
});
