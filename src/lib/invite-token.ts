import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!);
const EXPIRES_IN = "7d";

interface InvitePayload {
  tripId: number;
  role: "HOST" | "GUEST";
}

/**
 * 초대 JWT 토큰 생성. 7일 만료.
 */
export async function createInviteToken(payload: InvitePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

/**
 * 초대 JWT 토큰 검증. 만료/변조 시 null 반환.
 */
export async function verifyInviteToken(token: string): Promise<InvitePayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      tripId: payload.tripId as number,
      role: payload.role as "HOST" | "GUEST",
    };
  } catch {
    return null;
  }
}
