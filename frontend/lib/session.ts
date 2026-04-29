import type { AuthUser, Role } from "@/lib/api/types";

export const SESSION_TOKEN = "quiz_token";
export const SESSION_ROLE = "quiz_role";
export const SESSION_EMAIL = "quiz_email";

export type Session = {
  token: string;
  role: Role;
  email: string;
};

const maxAge = 60 * 60 * 24;

export function setSession(token: string, user: AuthUser): void {
  setCookie(SESSION_TOKEN, token);
  setCookie(SESSION_ROLE, user.role);
  setCookie(SESSION_EMAIL, user.email);
}

export function clearSession(): void {
  clearCookie(SESSION_TOKEN);
  clearCookie(SESSION_ROLE);
  clearCookie(SESSION_EMAIL);
}

export function readSession(): Session | null {
  if (typeof document === "undefined") {
    return null;
  }
  const cookies = parseCookies(document.cookie);
  const token = cookies.get(SESSION_TOKEN);
  const role = cookies.get(SESSION_ROLE);
  const email = cookies.get(SESSION_EMAIL);

  if (!token || !email || (role !== "admin" && role !== "user")) {
    return null;
  }

  return { token, role, email };
}

function parseCookies(raw: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of raw.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) {
      continue;
    }
    cookies.set(name, decodeURIComponent(valueParts.join("=")));
  }
  return cookies;
}

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
