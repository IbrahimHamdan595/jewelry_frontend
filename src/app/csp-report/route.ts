/**
 * Where browsers send CSP violation reports (report-uri in src/lib/csp.ts).
 * One log line per report so they show up in the deployment logs; that is
 * the "report-only run produces no violations" evidence before enforcing.
 * Not under /api, which is proxied to the backend.
 */
export const dynamic = "force-dynamic";

const MAX = 4_000;

export async function POST(req: Request): Promise<Response> {
  let summary = "(unreadable)";
  try {
    const text = (await req.text()).slice(0, MAX);
    try {
      const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> };
      const r = body["csp-report"] ?? (body as Record<string, unknown>);
      summary = [
        r["document-uri"] ?? r["documentURL"],
        r["violated-directive"] ?? r["effectiveDirective"],
        r["blocked-uri"] ?? r["blockedURL"],
      ].filter(Boolean).join(" | ") || text;
    } catch {
      summary = text;
    }
  } catch {
    // body could not be read; still acknowledge so the browser stops retrying
  }
  console.warn("[csp-report]", summary);
  return new Response(null, { status: 204 });
}
