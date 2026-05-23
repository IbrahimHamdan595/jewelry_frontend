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

// Must match backend JWT_EXPIRES_MINUTES (480 min = 8 h)
const COOKIE_MAX_AGE = 480 * 60;

function setTokenCookie(token: string) {
  const secure = typeof window !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  // SameSite=Lax is safe here: the cookie lives on the frontend domain (Vercel),
  // not the backend domain, so no cross-site write is happening.
  document.cookie = `mz_token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function clearTokenCookie() {
  document.cookie = "mz_token=; path=/; max-age=0";
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await api.post<LoginResponse>("/auth/login", { email, password });
  sessionStorage.setItem("mz_user", JSON.stringify(data.user));
  // Write the JWT onto the FRONTEND domain so the Next.js middleware can read it.
  // (The backend also sets its own HttpOnly cookie for its own cross-origin API calls.)
  setTokenCookie(data.access_token);
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // Even if the request fails, clear local state.
  }
  sessionStorage.removeItem("mz_user");
  clearTokenCookie();
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
