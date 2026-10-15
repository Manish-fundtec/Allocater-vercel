import { glJson } from "@/lib/api-client";
import {
  setAuthSession,
  setDashboardToken,
  setSelectedFundId,
  type AuthUser,
} from "@/lib/auth/session";
import {
  LOGIN_TARGET_ALLOCATOR,
  LOGIN_TARGET_TYCHI,
  LOGIN_TARGET_VAULT,
  normalizeLoginTarget,
  resolveTychiAppUrl,
  resolveVaultInboxUrl,
  type LoginTarget,
} from "@/lib/auth/login-target";

type SignInResponse = {
  message?: string;
  data?: Record<string, unknown>;
  accessToken?: string;
  userToken?: string;
  userAuthToken?: string;
  dashboardToken?: string;
  dashboard_token?: string;
  user?: Record<string, unknown>;
};

export type GlFund = {
  fund_id: string;
  fund_name: string;
  fund_status?: string;
};

function pickToken(body: SignInResponse): string | null {
  const nested = body.data ?? {};
  const token =
    body.accessToken ||
    body.userToken ||
    body.userAuthToken ||
    (nested.accessToken as string | undefined) ||
    (nested.userToken as string | undefined) ||
    (nested.userAuthToken as string | undefined);
  return token ? String(token) : null;
}

function normalizeUser(body: SignInResponse): AuthUser {
  const nested = (body.data?.user as Record<string, unknown> | undefined) ?? body.user ?? {};
  const email = String(nested.email ?? "");
  const name =
    String(nested.name ?? nested.full_name ?? "").trim() ||
    (email ? email.split("@")[0] : "User");
  return {
    id: nested.user_id ? String(nested.user_id) : undefined,
    name,
    email,
    role: String(nested.role_tag ?? nested.role ?? nested.master_role ?? "User"),
  };
}

export async function signInWithPassword(params: {
  email: string;
  password: string;
  loginTarget: LoginTarget;
}) {
  const body = await glJson<SignInResponse>("/api/v1/user_signin", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      email: params.email.trim().toLowerCase(),
      password: params.password,
    }),
  });

  const accessToken = pickToken(body);
  if (!accessToken) {
    throw new Error("Login failed. No token returned from server.");
  }

  const nested = body.data ?? {};
  const dashboardToken =
    body.dashboardToken ||
    body.dashboard_token ||
    (nested.dashboardToken as string | undefined) ||
    (nested.dashboard_token as string | undefined);

  const user = normalizeUser(body);
  const roleTag = user.role;

  setAuthSession({
    accessToken,
    loginTarget: normalizeLoginTarget(params.loginTarget),
    roleTag,
    user,
  });

  if (dashboardToken) {
    setDashboardToken(String(dashboardToken));
  }

  return { user, accessToken };
}

export async function fetchAssignedFunds(): Promise<GlFund[]> {
  const data = await glJson<{ funds?: GlFund[] } | GlFund[]>("/api/v1/fund?t=" + Date.now());
  if (Array.isArray(data)) return data;
  return Array.isArray(data.funds) ? data.funds : [];
}

export async function enterFund(fundId: string, loginTarget: LoginTarget) {
  try {
    const tokenRes = await glJson<{ token?: string }>("/api/v1/fund/token", {
      method: "POST",
      body: JSON.stringify({ fundId }),
    });
    if (tokenRes.token) {
      setDashboardToken(tokenRes.token);
    }
  } catch {
    // Fund token is optional for Allocator; continue with selected fund.
  }

  setSelectedFundId(fundId);
  const target = normalizeLoginTarget(loginTarget);

  if (target === LOGIN_TARGET_VAULT) {
    const base = resolveVaultInboxUrl();
    const sep = base.includes("?") ? "&" : "?";
    window.location.assign(
      `${base}${sep}fund_id=${encodeURIComponent(fundId)}`,
    );
    return;
  }

  if (target === LOGIN_TARGET_TYCHI) {
    window.location.assign(
      `${resolveTychiAppUrl()}/dashboards/analytics`,
    );
    return;
  }

  // Allocator (default)
  window.location.assign("/allocator");
}

export { LOGIN_TARGET_ALLOCATOR, LOGIN_TARGET_TYCHI, LOGIN_TARGET_VAULT };
