export interface AuthSession {
  accessToken: string;
  userId: string;
  email: string;
  role: string;
}

const AUTH_KEY = 'loom-auth';

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function setSession(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}
