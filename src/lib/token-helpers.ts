import { randomBytes, createHash } from "crypto";
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
