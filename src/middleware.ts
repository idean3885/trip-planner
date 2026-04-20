import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Auth.js가 브라우저에 남기는 쿠키 이름들.
 * #328 JWT 가드가 세션을 무효화해도 PKCE/state/callback-url 같은 부수 쿠키가
 * 남아 OAuth 재시작 흐름이 꼬일 수 있다(#329 후속). 세션이 비어 있는데 이 쿠키들이
 * 남아 있으면 stale로 간주하고 Max-Age=0으로 즉시 정리한다.
 */
const STALE_AUTH_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "__Secure-authjs.pkce.code_verifier",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.state",
  "authjs.state",
];

function clearStaleCookies(res: NextResponse, cookieNames: string[]) {
  for (const name of cookieNames) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: name.startsWith("__Secure-"),
      sameSite: "lax",
    });
  }
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/about" ||
    pathname.startsWith("/docs");

  // API 라우트는 자체 인증 처리 (PAT Bearer 토큰 + 세션 병행, auth-helpers.ts)
  if (isApiRoute) return;

  // 공개 라우트(랜딩 "/", About, API 문서)는 인증 불요
  // 로그인 사용자의 "/" 접근은 page.tsx 내부에서 /trips 리다이렉트 처리
  if (isPublicRoute) return;

  // 로그인 상태에서 auth 페이지 접근 → /trips(여행 목록)로
  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL("/trips", req.nextUrl));
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

    // stale 쿠키 감지 — 세션 없음인데 Auth.js 쿠키가 남아있으면 OAuth 재시작이
    // 꼬일 수 있어 리디렉트 응답에서 즉시 정리한다(#328 회귀 방어).
    const staleCookiesPresent = STALE_AUTH_COOKIES.filter((n) =>
      req.cookies?.has(n) ?? false
    );
    if (staleCookiesPresent.length > 0) {
      signInUrl.searchParams.set("stale", "1");
    }
    const res = NextResponse.redirect(signInUrl, 302);
    if (staleCookiesPresent.length > 0) {
      clearStaleCookies(res, staleCookiesPresent);
    }
    return res;
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
