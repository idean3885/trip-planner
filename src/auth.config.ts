import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [Google({ allowDangerousEmailAccountLinking: true })],
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
