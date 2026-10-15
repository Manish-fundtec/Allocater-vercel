const AUTH_COOKIE_NAMES = [
  "userToken",
  "dashboardToken",
  "fundtec_session",
  "loginTarget",
  "roleTag",
] as const;

function isTychiHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith("tychi.co");
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`,
    ),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options?: { maxAgeSeconds?: number },
) {
  if (typeof document === "undefined") return;
  const maxAge = options?.maxAgeSeconds ?? 60 * 60 * 24 * 365;
  let cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${maxAge}`;
  if (isTychiHost()) {
    cookie += "; domain=.tychi.co; Secure";
  }
  document.cookie = cookie;
}

export function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  let cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  if (isTychiHost()) {
    cookie += "; domain=.tychi.co; Secure";
  }
  document.cookie = cookie;
  // Also clear host-only copy if present
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function clearAuthCookies() {
  for (const name of AUTH_COOKIE_NAMES) {
    removeCookie(name);
  }
}
