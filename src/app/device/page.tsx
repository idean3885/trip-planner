/**
 * spec 060 (#793) — 헤드리스 device 인증 승인 화면.
 *
 * 사람이 자기 기기에서 verification_uri_complete(= /device?user_code=...) 를 탭해
 * 연다. Google 세션 필요(미인증 시 /auth/signin 으로 보냈다가 복귀). 최상위 경로에
 * 두는 이유: 미들웨어가 로그인 사용자의 `/auth/*` 접근을 /trips 로 보내기 때문
 * (기존 /bootstrap 과 동일한 이유).
 */

import { redirect } from "next/navigation";

import DeviceApproveCard from "@/components/DeviceApproveCard";
import { getSession } from "@/lib/auth-helpers";
import { isApprovablePending } from "@/lib/device-auth";

interface SP {
  user_code?: string;
}

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const userCode = sp.user_code ?? "";

  const session = await getSession();
  if (!session?.user?.id) {
    const callbackUrl = `/device?user_code=${encodeURIComponent(userCode)}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const valid = userCode ? await isApprovablePending(userCode) : false;

  return (
    <div className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-lg font-semibold tracking-tight">기기 로그인 승인</h1>
      {!userCode ? (
        <p className="text-muted-foreground text-sm">
          로그인 요청 코드가 없습니다. 도구가 안내한 링크로 다시 열어주세요.
        </p>
      ) : !valid ? (
        <p className="text-muted-foreground text-sm">
          만료되었거나 잘못된 요청입니다. 도구에서 인증을 다시 시작해 주세요.
        </p>
      ) : (
        <DeviceApproveCard userCode={userCode} />
      )}
    </div>
  );
}
