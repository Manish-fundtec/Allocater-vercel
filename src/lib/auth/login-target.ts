import { getCookie, setCookie } from "@/lib/auth/cookies";

export const LOGIN_TARGET_TYCHI = "tychi";
export const LOGIN_TARGET_VAULT = "vault";
export const LOGIN_TARGET_ALLOCATOR = "allocator";

export type LoginTarget =
  | typeof LOGIN_TARGET_TYCHI
  | typeof LOGIN_TARGET_VAULT
  | typeof LOGIN_TARGET_ALLOCATOR;

export function normalizeLoginTarget(value: unknown): LoginTarget {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === LOGIN_TARGET_VAULT) return LOGIN_TARGET_VAULT;
  if (raw === LOGIN_TARGET_TYCHI) return LOGIN_TARGET_TYCHI;
  return LOGIN_TARGET_ALLOCATOR;
}

export function getLoginTarget(): LoginTarget {
  return normalizeLoginTarget(
    getCookie("loginTarget") ?? LOGIN_TARGET_ALLOCATOR,
  );
}

export function setLoginTargetCookie(target: LoginTarget) {
  setCookie("loginTarget", normalizeLoginTarget(target));
}

export function resolveVaultInboxUrl(): string {
  return (
    process.env.NEXT_PUBLIC_VAULT_INBOX_URL?.replace(/\/$/, "") ??
    "https://vaultui.stage.tychi.co/vault/inbox"
  );
}

export function resolveTychiAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_TYCHI_APP_URL?.replace(/\/$/, "") ??
    "https://stage.tychi.co"
  );
}
