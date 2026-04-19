import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicRoute = pathname === "/about" || pathname.startsWith("/docs");

  // API 라우트는 자체 인증 처리 (PAT Bearer 토큰 + 세션 병행, auth-helpers.ts)
  if (isApiRoute) return;

  // 공개 라우트(About, API 문서)는 인증 불요
  if (isPublicRoute) return;

  // 로그인 상태에서 auth 페이지 접근 → 홈으로
  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // 비로그인 사용자의 auth 페이지 접근은 허용
  if (isAuthRoute) return;

  // 비로그인 사용자 → 로그인 페이지로 리다이렉트 (callbackUrl 보존)
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.nextUrl);
    const { pathname, search } = req.nextUrl;
    if (pathname !== "/") {
      signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    }
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
