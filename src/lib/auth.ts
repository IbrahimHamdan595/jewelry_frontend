import { api } from "./api-client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CASHIER";
  is_active: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  // Backend sets the auth cookie (HttpOnly). We only cache the user object
  // in sessionStorage for non-sensitive UI display (name, role badge).
  const data = await api.post<LoginResponse>("/auth/login", { email, password });
  sessionStorage.setItem("mz_user", JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // Even if the request fails, clear local UI state.
  }
  sessionStorage.removeItem("mz_user");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("mz_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem("mz_user");
    return null;
  }
}
