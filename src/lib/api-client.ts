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
    window.location.href = "/login";
  }
}

/**
 * An API failure that keeps the parsed `detail` reachable.
 *
 * FastAPI's `detail` is sometimes a string and sometimes an object (the
 * stale-rate guard returns `{code, message, rate_24k, ...}`). The old code did
 * `new Error(body.detail)`, which rendered an object as the literal string
 * "[object Object]" on screen. `message` keeps the old behaviour for the many
 * callers that only read it; `detail` is there for the ones that branch on a code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === "string"
        ? detail
        : (detail as { message?: string })?.message ?? `API error ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
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

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.detail);
  }
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
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    // Body is expected to be binary, so there is no `detail` to parse — but the
    // status is still worth carrying on the same error type as everything else.
    throw new ApiError(res.status, `Download failed (${res.status})`);
  }
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
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.detail ?? `Upload error ${res.status}`);
  }
  return res.json();
}
