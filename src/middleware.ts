import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/sign-in"];

function hasSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get("fundtec_session")?.value ||
      request.cookies.get("userToken")?.value ||
      request.cookies.get("dashboardToken")?.value,
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/gl-api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const authed = hasSession(request);

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && (pathname === "/auth/sign-in" || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/fundlist";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
