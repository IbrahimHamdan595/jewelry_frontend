import { describe, it, expect } from "vitest";
import { buildCsp, IMAGE_HOSTS } from "@/lib/csp";

const directive = (value: string, name: string) =>
  value.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ") || d === name);

const base = { nonce: "abc123", mode: "report-only" as const, nodeEnv: "production", vercelEnv: undefined };

describe("buildCsp", () => {
  it("is report-only unless enforcement is switched on", () => {
    expect(buildCsp(base).header).toBe("Content-Security-Policy-Report-Only");
    expect(buildCsp({ ...base, mode: "enforce" }).header).toBe("Content-Security-Policy");
  });

  it("forbids framing, plugins and base-tag hijacks", () => {
    const { value } = buildCsp(base);
    expect(directive(value, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(value, "object-src")).toBe("object-src 'none'");
    expect(directive(value, "base-uri")).toBe("base-uri 'self'");
    expect(directive(value, "form-action")).toBe("form-action 'self'");
  });

  it("allows scripts by nonce with strict-dynamic, never unsafe-inline", () => {
    const script = directive(buildCsp(base).value, "script-src")!;
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("allows eval only in development, where Next's dev runtime needs it", () => {
    expect(directive(buildCsp({ ...base, nodeEnv: "development" }).value, "script-src")).toContain("'unsafe-eval'");
  });

  it("covers the origins the app really uses: fonts, R2 images, the TradingView embed", () => {
    const { value } = buildCsp(base);
    expect(directive(value, "style-src")).toContain("https://fonts.googleapis.com");
    expect(directive(value, "font-src")).toContain("https://fonts.gstatic.com");
    expect(directive(value, "img-src")).toContain("https://pub-5092fdb36fa84b649893cd173e4339b7.r2.dev");
    expect(directive(value, "script-src")).toContain("https://s3.tradingview.com");
    expect(directive(value, "frame-src")).toContain("https://www.tradingview-widget.com");
  });

  it("keeps API traffic same-origin: connect-src is 'self' only in production", () => {
    expect(directive(buildCsp(base).value, "connect-src")).toBe("connect-src 'self'");
  });

  it("lets barcodes and blob downloads through", () => {
    const { value } = buildCsp(base);
    expect(directive(value, "img-src")).toContain("data:");
    expect(directive(value, "img-src")).toContain("blob:");
  });

  it("upgrades insecure requests only when enforcing in production — browsers flag it as ignored in report-only", () => {
    expect(buildCsp({ ...base, mode: "enforce" }).value).toContain("upgrade-insecure-requests");
    expect(buildCsp(base).value).not.toContain("upgrade-insecure-requests");
    expect(buildCsp({ ...base, mode: "enforce", nodeEnv: "development" }).value).not.toContain("upgrade-insecure-requests");
  });

  it("reports violations to the in-app endpoint", () => {
    expect(directive(buildCsp(base).value, "report-uri")).toBe("report-uri /csp-report");
  });

  it("admits the Vercel preview toolbar on preview deployments only", () => {
    expect(buildCsp({ ...base, vercelEnv: "preview" }).value).toContain("https://vercel.live");
    expect(buildCsp({ ...base, vercelEnv: "production" }).value).not.toContain("vercel.live");
  });

  it("names exactly the image host the product photos live on", () => {
    expect(IMAGE_HOSTS).toEqual(["pub-5092fdb36fa84b649893cd173e4339b7.r2.dev"]);
  });
});
