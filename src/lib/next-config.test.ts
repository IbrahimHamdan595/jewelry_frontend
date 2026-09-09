// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import nextConfig from "../../next.config.js";

type Rule = { source: string; destination: string };

async function rules(): Promise<Rule[]> {
  const out = await nextConfig.rewrites!();
  return (Array.isArray(out) ? out : [...out.beforeFiles, ...out.afterFiles, ...out.fallback]) as Rule[];
}

describe("next.config rewrites", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("proxies /api/* to BACKEND_API_URL so the backend's HttpOnly cookie lands on this origin", async () => {
    vi.stubEnv("BACKEND_API_URL", "https://api.fawaz.example/api");
    expect(await rules()).toContainEqual({ source: "/api/:path*", destination: "https://api.fawaz.example/api/:path*" });
  });

  it("falls back to the local backend for development", async () => {
    vi.stubEnv("BACKEND_API_URL", "");
    expect(await rules()).toContainEqual({ source: "/api/:path*", destination: "http://localhost:8001/api/:path*" });
  });
});

describe("next.config security (NEX-55)", () => {
  it("sets the legacy and modern anti-framing, nosniff and referrer headers on every route", async () => {
    const groups = await nextConfig.headers!();
    const all = groups.find((g) => g.source === "/(.*)")!;
    const get = (k: string) => all.headers.find((h) => h.key === k)?.value;
    expect(get("X-Frame-Options")).toBe("DENY");
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(get("Permissions-Policy")).toContain("camera=()");
  });

  it("lets the image optimizer fetch from the R2 bucket only — no wildcard host", () => {
    const patterns = nextConfig.images!.remotePatterns!;
    expect(patterns.map((p) => p.hostname)).toEqual(["pub-5092fdb36fa84b649893cd173e4339b7.r2.dev"]);
    expect(patterns.some((p) => String(p.hostname).includes("*"))).toBe(false);
  });
});
