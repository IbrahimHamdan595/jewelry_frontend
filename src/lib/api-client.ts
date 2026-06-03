function getBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes(".devtunnels.ms")) {
      const backendHost = host.replace(/-3001\./, "-8001.");
      return `https://${backendHost}/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api";
}

// Kept as no-ops for callers that still import these symbols. Auth is now
// driven by the HttpOnly cookie the backend sets on /auth/login.
export function saveToken(_token: string) {}
export function clearToken() {}

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
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
    throw new Error(body?.detail ?? `API error ${res.status}`);
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
    throw new Error(`Download failed (${res.status})`);
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
    throw new Error(body?.detail ?? `Upload error ${res.status}`);
  }
  return res.json();
}
