import { getAccessToken, clearAuthSession } from "@/lib/auth/session";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type FetchOptions = RequestInit & {
  /** Skip Authorization header (e.g. login). */
  skipAuth?: boolean;
  /** Redirect to sign-in on 401. Default true for allocator APIs. */
  logoutOn401?: boolean;
};

function authHeaders(skipAuth?: boolean): HeadersInit {
  if (skipAuth) return {};
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error || data.message || res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

/** Calls Allocator APIs via same-origin `/api/...` rewrite. */
export async function apiFetch(input: string, options: FetchOptions = {}) {
  const { skipAuth, logoutOn401 = true, headers, ...rest } = options;
  const res = await fetch(input, {
    ...rest,
    credentials: "include",
    headers: {
      ...authHeaders(skipAuth),
      ...headers,
    },
  });

  if (res.status === 401 && logoutOn401 && typeof window !== "undefined") {
    clearAuthSession();
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.assign(`/auth/sign-in?next=${next}`);
    throw new ApiClientError("Unauthorized", 401);
  }

  return res;
}

/** Calls Tychi GL APIs via same-origin `/gl-api/...` rewrite. */
export async function glFetch(path: string, options: FetchOptions = {}) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return apiFetch(`/gl-api${normalized}`, {
    logoutOn401: false,
    ...options,
  });
}

export async function glJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await glFetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new ApiClientError(await parseError(res), res.status);
  }
  return res.json() as Promise<T>;
}
