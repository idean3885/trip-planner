import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 현재 로그인 사용자의 세션을 가져온다. 미인증이면 null.
 */
export async function getSession() {
  return auth();
}

/**
 * 여행에 대한 현재 사용자의 TripMember를 조회한다.
 * 멤버가 아니면 null.
 */
export async function getTripMember(tripId: number, userId: string) {
  return prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
}

/**
 * 현재 사용자가 해당 여행의 주인(OWNER)인지 확인한다.
 */
export async function isOwner(tripId: number, userId: string) {
  const member = await getTripMember(tripId, userId);
  return member?.role === "OWNER";
}

/**
 * 현재 사용자가 해당 여행의 호스트(OWNER 또는 HOST)인지 확인한다.
 */
export async function isHost(tripId: number, userId: string) {
  const member = await getTripMember(tripId, userId);
  return member?.role === "OWNER" || member?.role === "HOST";
}

/**
 * 편집 권한 확인. OWNER 또는 HOST만 편집 가능. GUEST는 불가.
 */
export async function canEdit(tripId: number, userId: string) {
  return isHost(tripId, userId);
}
