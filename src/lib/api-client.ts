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

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mz_token");
}

export function saveToken(token: string) {
  localStorage.setItem("mz_token", token);
}

export function clearToken() {
  localStorage.removeItem("mz_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${getBase()}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
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

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // No Content-Type — browser sets it with multipart boundary automatically
  };
  const res = await fetch(`${getBase()}${path}`, { method: "POST", headers, body: formData });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Upload error ${res.status}`);
  }
  return res.json();
}
