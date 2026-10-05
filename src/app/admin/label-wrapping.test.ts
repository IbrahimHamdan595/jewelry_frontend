import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The admin screens translated in NEX-64 slice 4.
//
// jsx-a11y/label-has-associated-control cannot be relied on here: it assumes
// that a <label> whose content is an {expression} might contain its control,
// so once a label's text comes from the dictionary an unwrapped label passes
// lint. This checks the source instead: every <label> element must contain a
// form control, which is what makes a click focus the field and gives the
// field its accessible name. The screens' own tests then assert label.control
// on the rendered labels.
const FILES = [
  "src/app/admin/stock-take/[id]/page.tsx",
  "src/app/admin/stock-take/page.tsx",
  "src/app/admin/products/[id]/page.tsx",
  "src/app/admin/products/page.tsx",
  "src/app/admin/products/new/page.tsx",
  "src/app/admin/orders/[id]/page.tsx",
  "src/app/admin/orders/page.tsx",
  "src/components/admin/ConfirmDeleteDialog.tsx",
  "src/app/admin/zakat/page.tsx",
  "src/app/admin/accounting/tax/page.tsx",
  "src/app/admin/accounting/kpis/page.tsx",
  "src/app/admin/accounting/journal/page.tsx",
  "src/app/admin/accounting/periods/page.tsx",
  "src/components/accounting/ActionBar.tsx",
  "src/app/admin/dashboard/page.tsx",
];

const LABEL = /<label\b[\s\S]*?<\/label>/g;
const CONTROL = /<(?:input|select|textarea|Input)\b/;

const labelsIn = (file: string) => readFileSync(join(process.cwd(), file), "utf8").match(LABEL) ?? [];

describe("labels wrap their controls in the admin screens (NEX-64)", () => {
  it.each(FILES)("%s: every <label> contains its control", (file) => {
    const unwrapped = labelsIn(file).filter((label) => !CONTROL.test(label));
    expect(unwrapped).toEqual([]);
  });

  it("actually finds labels to check", () => {
    // Seven at the time of writing: stock-take reject reason, refund quantity,
    // three melt fields, two zakat snapshot fields. Finding none would mean
    // the pattern stopped matching, not that the labels are fine.
    expect(FILES.flatMap(labelsIn).length).toBeGreaterThan(0);
  });

  it("no label points at its control by id", () => {
    // Slice 1's convention: wrap, never htmlFor + id, so there is nothing to keep in sync.
    for (const file of FILES) expect(readFileSync(join(process.cwd(), file), "utf8"), file).not.toMatch(/htmlFor=/);
  });
});
