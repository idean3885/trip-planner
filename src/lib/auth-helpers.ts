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
 * 현재 사용자가 해당 여행의 HOST인지 확인한다.
 */
export async function isHost(tripId: number, userId: string) {
  const member = await getTripMember(tripId, userId);
  return member?.role === "HOST";
}
