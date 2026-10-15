import {
  clearAuthCookies,
  getCookie,
  removeCookie,
  setCookie,
} from "@/lib/auth/cookies";
import {
  LOGIN_TARGET_ALLOCATOR,
  type LoginTarget,
  setLoginTargetCookie,
} from "@/lib/auth/login-target";

const FUND_STORAGE_KEY = "allocator_fund_id";
const USER_STORAGE_KEY = "allocator_user";

export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

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

export function setAuthSession(params: {
  accessToken: string;
  loginTarget?: LoginTarget;
  roleTag?: string;
  user?: AuthUser | null;
}) {
  const { accessToken, loginTarget, roleTag, user } = params;
  setCookie("userToken", accessToken);
  // Allocator backend currently accepts fundtec_session (or Bearer).
  setCookie("fundtec_session", accessToken);
  setLoginTargetCookie(loginTarget ?? LOGIN_TARGET_ALLOCATOR);
  if (roleTag) setCookie("roleTag", roleTag);
  if (user && typeof window !== "undefined") {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function setDashboardToken(token: string) {
  setCookie("dashboardToken", token, { maxAgeSeconds: 60 * 60 * 6 });
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
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

export function clearAuthSession() {
  clearAuthCookies();
  removeCookie("userToken");
  removeCookie("fundtec_session");
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(FUND_STORAGE_KEY);
  }
}
