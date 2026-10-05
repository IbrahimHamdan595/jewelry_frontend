import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The admin screens translated in NEX-64 slice 4. In Arabic the page is RTL,
// so anything that affects reading order must use Tailwind's logical
// utilities: a physical `text-left` header sits on the opposite edge from its
// cells, and a physical `mr-3` puts the gap on the wrong side of a link.
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

// text-left/right -> text-start/end, ml/mr -> ms/me, pl/pr -> ps/pe,
// left-/right- offsets -> start-/end-. Responsive prefixes (sm:ml-4) count;
// an explicit rtl:/ltr: prefix is a deliberate per-direction choice and does not.
const PHYSICAL = /(?<![\w-])(?<!(?:rtl|ltr):)(?:text-(?:left|right)|-?[mp][lr]-[\d[]|(?:left|right)-[\d[])[\w.[\]/-]*/g;
// Lucide icons that point somewhere; each needs the repo's rtl:rotate-180.
const DIRECTIONAL_ICON = /<(?:Arrow(?:Left|Right)|Chevron(?:Left|Right))\b[^>]*>/g;

describe("RTL layout of the admin screens (NEX-64)", () => {
  it.each(FILES)("%s uses logical utilities only", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source.match(PHYSICAL) ?? []).toEqual([]);
  });

  it.each(FILES)("%s mirrors its directional icons in RTL", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const unmirrored = (source.match(DIRECTIONAL_ICON) ?? []).filter((tag) => !tag.includes("rtl:rotate-180"));
    expect(unmirrored).toEqual([]);
  });
});
