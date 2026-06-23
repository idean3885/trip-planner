import { createHash, randomBytes, randomInt } from "crypto";

import { prisma } from "@/lib/prisma";

/**
 * spec 060 (#793) — 헤드리스 Device Authorization Grant 헬퍼.
 *
 * 진행 중 인증 요청 상태(승인↔폴링 공유)를 다룬다. 발급 토큰(rawToken)은 저장하지
 * 않으며, 승인 후 폴링이 요청을 "원자적으로 claim(삭제)" 하면서 userId 만 받아가
 * 호출부(token route)가 createPAT 로 1회 발급한다.
 */

export const DEVICE_CODE_TTL_SEC = 600; // 요청 만료 10분
export const DEVICE_POLL_INTERVAL_SEC = 5; // 기본 폴링 간격

// user_code: 사람이 대조하는 짧은 코드. 혼동 문자(I/O/0/1) 배제.
const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USER_CODE_LEN = 8;

export function hashDeviceCode(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateUserCode(): string {
  let s = "";
  for (let i = 0; i < USER_CODE_LEN; i++) {
    s += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  }
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export interface StartedDeviceAuth {
  deviceCode: string; // 소비자 보관(평문, DB엔 해시만)
  userCode: string;
  expiresAt: Date;
  interval: number;
}

/** 개시 — 요청 행 생성 후 소비자/사람용 값 반환. */
export async function startDeviceAuthorization(): Promise<StartedDeviceAuth> {
  const deviceCode = randomBytes(32).toString("hex");
  const deviceCodeHash = hashDeviceCode(deviceCode);
  const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_SEC * 1000);

  // user_code 유니크 충돌 시 재시도(희박). deviceCodeHash 충돌은 사실상 불가.
  for (let attempt = 0; attempt < 5; attempt++) {
    const userCode = generateUserCode();
    try {
      await prisma.deviceAuthorizationRequest.create({
        data: {
          deviceCodeHash,
          userCode,
          status: "PENDING",
          expiresAt,
          interval: DEVICE_POLL_INTERVAL_SEC,
        },
      });
      return {
        deviceCode,
        userCode,
        expiresAt,
        interval: DEVICE_POLL_INTERVAL_SEC,
      };
    } catch (e) {
      if (attempt === 4) throw e; // 마지막 시도까지 실패하면 전파
    }
  }
  throw new Error("device authorization 생성 실패");
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export type PollOutcome =
  | { kind: "pending"; interval: number }
  | { kind: "slow_down"; interval: number }
  | { kind: "denied" }
  | { kind: "expired" }
  | { kind: "approved"; userId: string };

/**
 * 폴링 1회 처리. 상태/만료/slow_down 판정.
 * - approved: 요청을 원자적으로 claim(삭제)하고 userId 반환(발급은 호출부). 1회만 성공.
 * - denied/expired: 행 삭제(lazy cleanup) 후 종료 신호.
 * - pending: lastPolledAt 갱신.
 */
export async function pollDeviceAuthorization(
  deviceCode: string,
): Promise<PollOutcome> {
  const deviceCodeHash = hashDeviceCode(deviceCode);
  const req = await prisma.deviceAuthorizationRequest.findUnique({
    where: { deviceCodeHash },
  });
  if (!req) return { kind: "expired" }; // 미존재/이미 소비

  if (isExpired(req.expiresAt)) {
    await prisma.deviceAuthorizationRequest
      .delete({ where: { id: req.id } })
      .catch(() => {});
    return { kind: "expired" };
  }

  // 과도 폴링 억제: 직전 폴링이 interval 이내면 slow_down + interval 상향.
  const now = Date.now();
  if (
    req.lastPolledAt &&
    now - req.lastPolledAt.getTime() < req.interval * 1000
  ) {
    const bumped = req.interval + 5;
    await prisma.deviceAuthorizationRequest.update({
      where: { id: req.id },
      data: { interval: bumped, lastPolledAt: new Date() },
    });
    return { kind: "slow_down", interval: bumped };
  }

  if (req.status === "DENIED") {
    await prisma.deviceAuthorizationRequest
      .delete({ where: { id: req.id } })
      .catch(() => {});
    return { kind: "denied" };
  }

  if (req.status === "APPROVED" && req.userId) {
    // 원자적 claim — 동시 폴링 중 정확히 1건만 발급(SC-005).
    const claimed = await prisma.deviceAuthorizationRequest.deleteMany({
      where: { id: req.id, status: "APPROVED" },
    });
    if (claimed.count === 1) return { kind: "approved", userId: req.userId };
    return { kind: "expired" }; // 이미 다른 폴링이 가져감
  }

  // PENDING — 대기. 폴링 시각 기록.
  await prisma.deviceAuthorizationRequest.update({
    where: { id: req.id },
    data: { lastPolledAt: new Date() },
  });
  return { kind: "pending", interval: req.interval };
}

/** 승인 화면 — userCode 로 요청 조회. */
export async function findByUserCode(userCode: string) {
  return prisma.deviceAuthorizationRequest.findUnique({ where: { userCode } });
}

/**
 * 승인 화면용 — userCode 가 승인 가능한 PENDING 요청이면 true(만료/비PENDING이면 false).
 * 만료 판정(Date.now)을 서버 헬퍼에서 수행해, 화면 컴포넌트 렌더에서 불순 호출을 피한다.
 */
export async function isApprovablePending(userCode: string): Promise<boolean> {
  const req = await prisma.deviceAuthorizationRequest.findUnique({
    where: { userCode },
  });
  return (
    !!req && req.status === "PENDING" && req.expiresAt.getTime() >= Date.now()
  );
}

/** 승인 — 본인 userId 기록. 만료/비PENDING이면 false. */
export async function approveDeviceRequest(
  userCode: string,
  userId: string,
): Promise<boolean> {
  const req = await prisma.deviceAuthorizationRequest.findUnique({
    where: { userCode },
  });
  if (!req || isExpired(req.expiresAt) || req.status !== "PENDING") {
    return false;
  }
  await prisma.deviceAuthorizationRequest.update({
    where: { id: req.id },
    data: { status: "APPROVED", userId },
  });
  return true;
}

/** 거부. */
export async function denyDeviceRequest(userCode: string): Promise<boolean> {
  const req = await prisma.deviceAuthorizationRequest.findUnique({
    where: { userCode },
  });
  if (!req || req.status !== "PENDING") return false;
  await prisma.deviceAuthorizationRequest.update({
    where: { id: req.id },
    data: { status: "DENIED" },
  });
  return true;
}

/** 만료 행 lazy 정리. 반환: 삭제 건수. */
export async function cleanupExpired(): Promise<number> {
  const res = await prisma.deviceAuthorizationRequest.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return res.count;
}
