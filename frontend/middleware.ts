import { NextResponse, type NextRequest } from "next/server";

import { SESSION_ROLE, SESSION_TOKEN } from "@/lib/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_TOKEN)?.value;
  const role = request.cookies.get(SESSION_ROLE)?.value;

  if (pathname.startsWith("/admin") && (!token || role !== "admin")) {
    return redirectTo(request, "/login");
  }

  if (pathname.startsWith("/quizzes") && (!token || role !== "user")) {
    return redirectTo(request, "/login");
  }

  if ((pathname === "/login" || pathname === "/register") && token && (role === "admin" || role === "user")) {
    return redirectTo(request, role === "admin" ? "/admin/quizzes" : "/quizzes");
  }

  return NextResponse.next();
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/quizzes/:path*", "/login", "/register"],
};
