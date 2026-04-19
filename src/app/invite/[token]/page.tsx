import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken } from "@/lib/invite-token";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  // 비로그인 → 로그인 후 돌아오기
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/invite/${token}`);
  }

  // JWT 검증 (만료/변조 체크)
  const payload = await verifyInviteToken(token);

  if (!payload) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            초대가 만료되었거나 유효하지 않습니다
          </h1>
          <p className="text-base text-muted-foreground">
            호스트에게 새 초대 링크를 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  // 여행 존재 확인
  const trip = await prisma.trip.findUnique({
    where: { id: payload.tripId },
    select: { id: true, title: true },
  });

  if (!trip) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            여행을 찾을 수 없습니다
          </h1>
        </div>
      </div>
    );
  }

  // 이미 멤버인지 확인
  const existing = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: session.user.id } },
  });

  if (existing) {
    redirect(`/trips/${trip.id}`);
  }

  // TripMember 생성
  await prisma.tripMember.create({
    data: {
      tripId: trip.id,
      userId: session.user.id,
      role: payload.role,
    },
  });

  redirect(`/trips/${trip.id}`);
}
