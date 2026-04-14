import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  // 초대 조회
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { trip: { select: { id: true, title: true } } },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-heading-lg font-bold text-surface-900">초대를 찾을 수 없습니다</h1>
          <p className="text-body-md text-surface-500">링크가 잘못되었거나 만료되었습니다.</p>
        </div>
      </div>
    );
  }

  if (invitation.status !== "PENDING") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-heading-lg font-bold text-surface-900">이미 처리된 초대입니다</h1>
          <p className="text-body-md text-surface-500">
            {invitation.status === "ACCEPTED" ? "이미 수락된 초대입니다." : "만료된 초대입니다."}
          </p>
        </div>
      </div>
    );
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-heading-lg font-bold text-surface-900">초대가 만료되었습니다</h1>
          <p className="text-body-md text-surface-500">호스트에게 새 초대를 요청하세요.</p>
        </div>
      </div>
    );
  }

  // 이미 멤버인지 확인
  const existing = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: invitation.tripId, userId: session.user.id } },
  });

  if (existing) {
    redirect(`/trips/${invitation.tripId}`);
  }

  // 초대 수락: TripMember 생성 + Invitation 상태 변경
  await prisma.$transaction([
    prisma.tripMember.create({
      data: {
        tripId: invitation.tripId,
        userId: session.user.id,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  redirect(`/trips/${invitation.tripId}`);
}
