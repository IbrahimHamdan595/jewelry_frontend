import { api, saveToken, clearToken } from "./api-client";

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
  const data = await api.post<LoginResponse>("/auth/login", { email, password });
  saveToken(data.access_token);
  sessionStorage.setItem("mz_user", JSON.stringify(data.user));
  // Set cookies so the middleware can read role without hitting the API
  document.cookie = `mz_token=${data.access_token}; path=/; SameSite=Lax`;
  document.cookie = `mz_role=${data.user.role}; path=/; SameSite=Lax`;
  return data.user;
}

export async function logout() {
  clearToken();
  sessionStorage.removeItem("mz_user");
  document.cookie = "mz_token=; Max-Age=0; path=/";
  document.cookie = "mz_role=; Max-Age=0; path=/";
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("mz_user");
  return raw ? JSON.parse(raw) : null;
}
