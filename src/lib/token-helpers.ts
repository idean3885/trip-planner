import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

export interface CreatePATResult {
  rawToken: string;
  id: number;
  name: string;
  tokenPrefix: string;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * spec 059 — 자동 발급(브라우저 OAuth 로그인) 토큰의 기본 수명(일).
 * 수기 발급(`/api/tokens`)에는 적용하지 않는다(사용자가 만료를 직접 정함/무만료 허용).
 * 장수명 토큰을 무기한 보관하는 위험을 줄이기 위해 자동 발급은 단기 만료를 둔다.
 */
export const AUTO_PAT_TTL_DAYS = 30;

/** 지금부터 자동 발급 토큰의 만료 시각(now + AUTO_PAT_TTL_DAYS). */
export function autoPatExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + AUTO_PAT_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * PAT를 생성하고 DB에 저장한다.
 * rawToken은 이 함수 호출 시에만 얻을 수 있다 (DB에는 해시만 저장).
 */
export async function createPAT(
  userId: string,
  name: string,
  expiresAt: Date | null = null,
): Promise<CreatePATResult> {
  const rawToken = `tp_${randomBytes(32).toString("hex")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenPrefix = rawToken.slice(0, 11);

  const pat = await prisma.personalAccessToken.create({
    data: { userId, name, tokenHash, tokenPrefix, expiresAt },
  });

  return {
    rawToken,
    id: pat.id,
    name: pat.name,
    tokenPrefix: pat.tokenPrefix,
    expiresAt: pat.expiresAt,
    createdAt: pat.createdAt,
  };
}
