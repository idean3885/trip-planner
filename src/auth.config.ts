import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
  // 요청 Host 헤더를 신뢰하여 OAuth 콜백 URL을 자체 도출.
  // Vercel/Next.js 배포에서는 Host가 플랫폼에서 검증되므로 안전.
  // 효과: AUTH_URL 수동 설정 없이도 각 환경(prod/dev/preview/local)이 자기 origin만 보고 동작.
  trustHost: true,
  providers: [Google({ allowDangerousEmailAccountLinking: true })],
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
