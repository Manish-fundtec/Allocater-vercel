import {
  clearAuthCookies,
  getCookie,
  removeCookie,
  setCookie,
} from "@/lib/auth/cookies";

const FUND_STORAGE_KEY = "allocator_fund_id";

export function getAccessToken(): string | null {
  return (
    getCookie("userToken") ||
    getCookie("fundtec_session") ||
    getCookie("dashboardToken")
  );
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

/** Ensure Allocator backend sees a session cookie when only Tychi userToken exists. */
export function syncAllocatorSessionCookie() {
  const userToken = getCookie("userToken");
  const existing = getCookie("fundtec_session");
  if (userToken && !existing) {
    setCookie("fundtec_session", userToken);
  }
}

export function setSelectedFundId(fundId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FUND_STORAGE_KEY, fundId);
}

export function getSelectedFundId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FUND_STORAGE_KEY);
}

/** Prefer ?fund_id= / ?fundId= from Tychi fundlist redirect. */
export function getFundIdFromSearch(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl =
      params.get("fund_id") || params.get("fundId") || params.get("fundid");
    const normalized = fromUrl ? String(fromUrl).trim() : "";
    return normalized || null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  clearAuthCookies();
  removeCookie("userToken");
  removeCookie("fundtec_session");
  removeCookie("dashboardToken");
  if (typeof window !== "undefined") {
    localStorage.removeItem(FUND_STORAGE_KEY);
  }
}

export function getTychiSignInUrl(loginTarget = "allocator"): string {
  const base =
    process.env.NEXT_PUBLIC_TYCHI_APP_URL?.replace(/\/$/, "") ??
    "https://stage.tychi.co";
  return `${base}/auth/sign-in?loginTarget=${encodeURIComponent(loginTarget)}`;
}

export function getTychiFundListUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_TYCHI_APP_URL?.replace(/\/$/, "") ??
    "https://stage.tychi.co";
  return `${base}/fundlist?loginTarget=allocator`;
}
