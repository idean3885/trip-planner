import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      // DB 분리·이관·데이터 초기화 등으로 쿠키의 userId가 현재 DB에 존재하지 않을 수
      // 있다(#328). 쿠키가 stale이면 세션을 무효화하여 재로그인으로 흐르게 한다.
      if (token.id) {
        const exists = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        });
        if (!exists) return null;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
    /**
     * 재동의 시 Account 정보 동기화 (#332).
     * PrismaAdapter는 기존 Account가 있으면 linkAccount를 호출하지 않아 재로그인
     * 시 새로 받은 access_token/refresh_token/scope/expires_at이 DB에 반영되지
     * 않는다. 이 콜백에서 직접 upsert하여 scope 증분 동의가 항상 반영되게 한다.
     */
    async signIn({ user, account }) {
      if (!account || account.type !== "oauth") return true;
      if (!user?.id) return true;
      try {
        await prisma.account.updateMany({
          where: {
            userId: user.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: account.access_token ?? undefined,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at ?? undefined,
            token_type: account.token_type ?? undefined,
            scope: account.scope ?? undefined,
            id_token: account.id_token ?? undefined,
          },
        });
      } catch {
        /* 기록 실패해도 로그인 흐름은 유지 — 다음 요청에서 scope 부족 시 재동의 유도 */
      }
      return true;
    },
  },
  ...authConfig,
});
