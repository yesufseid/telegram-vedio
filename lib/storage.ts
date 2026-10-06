export const WAITLIST_KEY = "verificationStatus";
export const WAITLIST_VALUE = "WAITLIST";
export const SESSION_KEY = "miniappSession";
export const VERIFICATION_TOKEN_KEY = "verificationToken";

export function markWaitlist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WAITLIST_KEY, WAITLIST_VALUE);
}

export function isOnWaitlist(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WAITLIST_KEY) === WAITLIST_VALUE;
}

export function clearWaitlist() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WAITLIST_KEY);
}

export function saveSession(sessionToken: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, sessionToken);
}

export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(VERIFICATION_TOKEN_KEY);
}

export function saveVerificationToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VERIFICATION_TOKEN_KEY, token);
}

export function getVerificationToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VERIFICATION_TOKEN_KEY);
}

export function clearVerificationToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VERIFICATION_TOKEN_KEY);
}