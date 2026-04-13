import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  // Auth API 라우트는 항상 허용
  if (isApiAuthRoute) return;

  // 로그인 페이지는 항상 허용
  if (isAuthRoute) return;

  // 비로그인 사용자 → 로그인 페이지로 리다이렉트
  if (!isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
