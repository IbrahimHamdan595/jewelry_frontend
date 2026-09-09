import { api } from "./api-client";
import { clearStoredCart } from "./cart-storage";
import type { Role } from "@/types/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/**
 * The session is the backend's HttpOnly cookie. Because every API call goes
 * through the same-origin /api proxy (next.config.js), that cookie is set on
 * THIS origin, so the middleware can read it and no script ever can. The
 * token in the login body is deliberately not kept anywhere.
 *
 * sessionStorage.mz_user is display data (name, role), not a credential; it
 * is cleared on logout and on any 401 (api-client) so the UI cannot look
 * signed in after the cookie is gone.
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await api.post<LoginResponse>("/auth/login", { email, password });
  sessionStorage.setItem("mz_user", JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // Even if the request fails, clear local state.
  }
  sessionStorage.removeItem("mz_user");
  clearStoredCart();
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
