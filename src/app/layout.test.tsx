import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import RootLayout from "@/app/layout";

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: (k: string) => (k === "mz_lang" && jar.value ? { name: k, value: jar.value } : undefined) }) }));

describe("root layout language", () => {
  it("serves Arabic RTL markup when the language cookie says so", () => {
    jar.value = "ar";
    const html = renderToString(<RootLayout><div>x</div></RootLayout>);
    expect(html).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);
  });

  it("defaults to English LTR without a cookie", () => {
    jar.value = undefined;
    const html = renderToString(<RootLayout><div>x</div></RootLayout>);
    expect(html).toMatch(/<html[^>]*lang="en"[^>]*dir="ltr"/);
  });
});
