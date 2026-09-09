/**
 * Content-Security-Policy for every HTML response (applied by the middleware).
 *
 * Scripts are allowed by per-request nonce + 'strict-dynamic': Next tags its
 * own inline/bootstrap scripts with the nonce it finds in the request's CSP
 * header, and anything those scripts load (the TradingView embed, chunks) is
 * trusted transitively. No 'unsafe-inline' for scripts, ever.
 *
 * Styles keep 'unsafe-inline': Radix, Recharts and the print CSS all set
 * style attributes, which a nonce cannot cover. The XSS payoff of inline
 * styles is small; the payoff of inline scripts is the whole session.
 *
 * Mode: report-only by default so real traffic can prove the policy clean
 * (reports land on /csp-report → server logs); CSP_MODE=enforce flips it.
 */
import { IMAGE_HOSTS as HOSTS } from "../../image-hosts.js";

export const IMAGE_HOSTS: string[] = HOSTS;

export type CspMode = "enforce" | "report-only";

export interface CspInput {
  nonce: string;
  mode: CspMode;
  /** process.env.NODE_ENV — development needs 'unsafe-eval' for React Refresh. */
  nodeEnv?: string;
  /** process.env.VERCEL_ENV — "preview" injects the Vercel toolbar (vercel.live). */
  vercelEnv?: string;
}

export function buildCsp({ nonce, mode, nodeEnv, vercelEnv }: CspInput): { header: string; value: string } {
  const dev = nodeEnv === "development";
  const preview = vercelEnv === "preview";
  const images = IMAGE_HOSTS.map((h) => `https://${h}`);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://s3.tradingview.com",
      ...(dev ? ["'unsafe-eval'"] : []),
      ...(preview ? ["https://vercel.live"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", ...(preview ? ["https://vercel.live"] : [])],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com", ...(preview ? ["https://vercel.live"] : [])],
    // data:/blob: — barcodes and QR codes are canvases turned into data URLs;
    // Excel exports are blob downloads.
    "img-src": ["'self'", "data:", "blob:", ...images, ...(preview ? ["https://vercel.live", "https://vercel.com"] : [])],
    // The API is same-origin through the /api proxy (NEX-59), so nothing else.
    "connect-src": ["'self'", ...(preview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : [])],
    "frame-src": ["https://www.tradingview-widget.com", "https://www.tradingview.com", ...(preview ? ["https://vercel.live"] : [])],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Meaningless in a report-only policy (browsers log a notice), so only when enforcing.
  if (!dev && mode === "enforce") parts.push("upgrade-insecure-requests");
  parts.push("report-uri /csp-report");

  return {
    header: mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: parts.join("; "),
  };
}

/** A fresh base64 nonce, 128 bits, from the Web Crypto available on the Edge runtime. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
}
