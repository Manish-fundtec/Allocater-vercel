import {
  getAccessToken,
  clearAuthSession,
  getTychiSignInUrl,
} from "@/lib/auth/session";

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
  skipAuth?: boolean;
  logoutOn401?: boolean;
};

function authHeaders(skipAuth?: boolean): HeadersInit {
  if (skipAuth) return {};
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
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
    window.location.assign(getTychiSignInUrl("allocator"));
    throw new ApiClientError("Unauthorized", 401);
  }

  return res;
}
