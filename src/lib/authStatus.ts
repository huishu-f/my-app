import { AUTH_STATUS_COOKIE } from "@/lib/authConstants";

const LOGOUT_SIGNAL = "auth_logout_signal";

export function hasAuthStatus(): boolean {
  return document.cookie.includes(`${AUTH_STATUS_COOKIE}=1`);
}

export function clearAuthStatus(): void {
  if (hasAuthStatus()) {
    document.cookie = `${AUTH_STATUS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  localStorage.setItem(LOGOUT_SIGNAL, Date.now().toString());
}

export function wasLogoutSignaled(storageEvent: StorageEvent): boolean {
  return storageEvent.key === LOGOUT_SIGNAL;
}
