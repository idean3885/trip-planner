import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Auth.js 세션 쿠키 이름 목록(stale 감지 대상).
 *
 * 진짜 stale 신호는 "session-token이 있는데 auth 결과는 false"다. callback-url /
 * pkce / state 같은 부수 쿠키는 정상 흐름에도 남을 수 있어(로그아웃 직후 포함)
 * stale 신호에서 제외한다(#337). session-token이 감지돼 정리할 때 같은 응답에서
 * 부수 쿠키들도 함께 만료시켜 OAuth 재시작 꼬임도 함께 해소한다.
 */
const STALE_SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

const AUXILIARY_AUTH_COOKIES = [
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

    // stale 세션 감지 — session-token이 남아있는데 auth가 false면 쿠키가 꼬인 상태.
    // 리디렉트 응답에서 세션·부수 쿠키를 함께 만료시켜 다음 로그인이 깔끔하게 시작되게 한다.
    const staleSessionsPresent = STALE_SESSION_COOKIES.filter((n) =>
      req.cookies?.has(n) ?? false
    );
    if (staleSessionsPresent.length > 0) {
      signInUrl.searchParams.set("stale", "1");
    }
    const res = NextResponse.redirect(signInUrl, 302);
    if (staleSessionsPresent.length > 0) {
      // 세션 쿠키 + 부수 쿠키(PKCE/state)도 함께 정리
      const auxPresent = AUXILIARY_AUTH_COOKIES.filter((n) =>
        req.cookies?.has(n) ?? false
      );
      clearStaleCookies(res, [...staleSessionsPresent, ...auxPresent]);
    }
    return res;
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
