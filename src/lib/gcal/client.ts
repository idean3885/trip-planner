/**
 * Google Calendar API 클라이언트.
 *
 * 본 모듈은 세션 사용자의 Google Account access_token으로만 Calendar 클라이언트를
 * 구성한다. userId 매개변수를 받지만 내부 조회는 항상 그 id로만 수행하며, 호출부는
 * 반드시 session.user.id를 넘기도록 한다(본인 토큰 경계, FR-007).
 *
 * ADR-0002에 따라 공식 SDK(`@googleapis/calendar`, `google-auth-library`)를 사용한다.
 */

import { calendar_v3, calendar } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";

import { prisma } from "@/lib/prisma";

export { classifyError, getStatus, isPreconditionFailed } from "./errors";

export interface GCalClient {
  calendar: calendar_v3.Calendar;
  oauth2: OAuth2Client;
}

/**
 * 주어진 사용자의 Google Account access_token으로 Calendar v3 클라이언트를 만든다.
 * Account가 없거나 access_token이 비어 있으면 null을 반환한다.
 *
 * oauth2 클라이언트는 내부적으로 만료 시 refresh_token으로 자동 갱신하며, 갱신된
 * 값은 `tokens` 이벤트 훅으로 Prisma Account에 동기화된다.
 */
export async function getCalendarClient(userId: string): Promise<GCalClient | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });
  if (!account?.access_token) return null;

  const oauth2 = new OAuth2Client({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  });
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token ?? account.refresh_token ?? undefined,
        expires_at: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : undefined,
      },
    });
  });

  return { calendar: calendar({ version: "v3", auth: oauth2 }), oauth2 };
}

