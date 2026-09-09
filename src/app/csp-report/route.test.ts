// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/csp-report/route";

describe("POST /csp-report", () => {
  it("accepts a browser CSP report, logs one line, and returns 204", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const report = { "csp-report": { "document-uri": "http://till.test/pos", "violated-directive": "script-src", "blocked-uri": "https://evil.example/x.js" } };
    const res = await POST(new Request("http://till.test/csp-report", { method: "POST", headers: { "content-type": "application/csp-report" }, body: JSON.stringify(report) }));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0].join(" "))).toContain("https://evil.example/x.js");
    warn.mockRestore();
  });

  it("never throws on junk", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(new Request("http://till.test/csp-report", { method: "POST", body: "not json" }));
    expect(res.status).toBe(204);
  });
});
