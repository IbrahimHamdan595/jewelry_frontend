import type { StaleRateErrorDetail } from "@/types/api";

/**
 * Every request goes to the same-origin /api proxy (see next.config.js),
 * never straight to the backend. That is what keeps the backend's HttpOnly
 * session cookie on this origin, where the middleware can read it and page
 * scripts cannot. Deliberately not configurable from the client: an absolute
 * NEXT_PUBLIC_API_URL would silently move the cookie out of reach again.
 */
function getBase(): string {
  return "/api";
}

/** Absolute-on-this-origin URL for an API path, for plain <a href> links (exports, receipts). */
export function apiUrl(path: string): string {
  return `${getBase()}${path}`;
}

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    // The cookie is gone or invalid; forget the display user with it so the
    // UI cannot look signed in while every request fails.
    try {
      sessionStorage.removeItem("mz_user");
    } catch {
      // storage unavailable — nothing to forget
    }
    // On the sign-in page a 401 is a wrong password, not a lost session.
    // Navigating to /login from /login reloads it, which throws away the
    // form, the ?next= deep link and the error the user is about to read.
    if (window.location.pathname !== "/login") window.location.href = "/login";
  }
}

/**
 * The backend's own sentence for a failure, when it wrote one: a string
 * `detail`, or the `message` of a structured one (the stale-rate guard). An
 * empty string, a validation list (see validationMessageOf) or no `detail` at
 * all is `null`.
 */
function serverMessageOf(detail: unknown): string | null {
  if (typeof detail === "string") return detail.trim() ? detail : null;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return null;
}

/** Where in the request a validation entry points; not part of the field's own name. */
const REQUEST_PARTS = new Set(["body", "query", "path", "header", "cookie"]);

/**
 * What a FastAPI validation failure (422) rejected, from the first entry of
 * its list: `[{loc: ["body", "new_password"], msg: "String should have at
 * least 8 characters", …}]` reads "new_password: String should have at least
 * 8 characters". One entry is enough to act on; fixing it surfaces the next.
 * null when `detail` is not such a list.
 */
function validationMessageOf(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null;
  const first = detail[0] as { loc?: unknown; msg?: unknown } | undefined;
  if (!first || typeof first.msg !== "string" || !first.msg.trim()) return null;
  const field = Array.isArray(first.loc)
    ? first.loc.filter((part, i) => !(i === 0 && REQUEST_PARTS.has(String(part)))).join(".")
    : "";
  return field ? `${field}: ${first.msg}` : first.msg;
}

/**
 * An API failure: the HTTP status, and the parsed `detail` when the body had one.
 *
 * FastAPI's `detail` is sometimes a string, sometimes an object (the
 * stale-rate guard returns `{code, message, rate_24k, ...}`) and, for a 422, a
 * list of rejected fields. `detail` is there for callers that branch on a
 * code; `serverMessage` is a sentence the server wrote for a person, or null;
 * `validationMessage` is the first rejected field of a 422, or null.
 *
 * `message` is for logs: the server's words when there are any, else
 * "API error <status>". Do not put it on screen — use `errorMessage(err,
 * fallback)`, which never shows that English placeholder.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  readonly serverMessage: string | null;
  readonly validationMessage: string | null;

  constructor(status: number, detail: unknown) {
    const serverMessage = serverMessageOf(detail);
    const validationMessage = validationMessageOf(detail);
    super(serverMessage ?? validationMessage ?? `API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.serverMessage = serverMessage;
    this.validationMessage = validationMessage;
  }
}

// Left-to-right isolate … pop directional isolate: the same pair the Arabic
// dictionary puts around codes and amounts, so an English run inside an Arabic
// sentence keeps its own order. Invisible, and harmless in English.
const LRI = "\u2066";
const PDI = "\u2069";

/**
 * What to show a person when a request fails — the one place that decides.
 *
 *   - the backend said why (a string `detail`, or a structured one's
 *     `message`): show that, as it is. It is server data, like a product
 *     name, and is not translated here.
 *   - the backend rejected a field (a 422 validation list): `fallback`, then
 *     the first rejected field and its reason, isolated left-to-right — so the
 *     user reads "couldn't save" in their language and still learns what to fix.
 *   - anything else — the connection dropped ("Failed to fetch"), a bare
 *     status, a body with no `detail` such as the rate limiter's
 *     `{"error": ...}`, or something that was not a request at all: show
 *     `fallback`, which the caller passes already translated (t.….saveFailed).
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.serverMessage !== null) return err.serverMessage;
  if (err.validationMessage !== null) return `${fallback} — ${LRI}${err.validationMessage}${PDI}`;
  return fallback;
}

/** The HTTP status of a failed request; undefined when no response came back at all. */
export function errorStatus(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : undefined;
}

/** `detail` of an error response; undefined when the body is not JSON or has none. */
async function detailOf(res: Response): Promise<unknown> {
  const body = await res.json().catch(() => null);
  return body && typeof body === "object" ? (body as { detail?: unknown }).detail : undefined;
}

/** Narrow an unknown catch value to a stale-rate guard rejection. */
export function staleRateError(err: unknown): StaleRateErrorDetail | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const d = err.detail as StaleRateErrorDetail | undefined;
  if (d?.code === "STALE_RATE_ACK_REQUIRED" || d?.code === "STALE_RATE_ACK_MISMATCH") {
    return d;
  }
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${getBase()}${path}`, { ...init, headers, credentials: "include" });

  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(res.status, await detailOf(res));
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function apiFetcher<T>(path: string): Promise<T> {
  return request<T>(path);
}

// Download a binary response (e.g. xlsx) through the same cookie-authenticated
// fetch pipeline, then trigger a browser save. Used by report Excel exports.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await fetch(`${getBase()}${path}`, { credentials: "include" });
  if (res.status === 401) handleUnauthorized();
  // A refusal is JSON even where the success is binary, so a `detail` is read
  // when there is one; otherwise the error carries the status alone.
  if (!res.ok) throw new ApiError(res.status, await detailOf(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
    // No Content-Type — browser sets it with multipart boundary automatically.
  });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(res.status, await detailOf(res));
  return res.json();
}
