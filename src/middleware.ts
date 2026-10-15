import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get("fundtec_session")?.value ||
      request.cookies.get("userToken")?.value ||
      request.cookies.get("dashboardToken")?.value,
  );
}

function tychiSignInUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_TYCHI_APP_URL?.replace(/\/$/, "") ??
    "https://stage.tychi.co";
  return `${base}/auth/sign-in?loginTarget=allocator`;
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

  // Login + fund list live on Tychi GL UI — do not host duplicates here.
  if (
    pathname === "/auth/sign-in" ||
    pathname.startsWith("/auth/") ||
    pathname === "/fundlist"
  ) {
    return NextResponse.redirect(tychiSignInUrl());
  }

  if (!hasSession(request)) {
    return NextResponse.redirect(tychiSignInUrl());
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/allocator";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
