import { AlertTriangle } from "lucide-react";
import { GCAL_DISCUSSIONS_URL } from "@/lib/gcal/unregistered";

/**
 * spec 021 — 랜딩 페이지의 Testing 모드 제약 사전 고지 블록.
 *
 * 본 앱은 아직 외부 캘린더 OAuth 앱 심사 전 단계라, 개발자가 Test users 목록에
 * 등록한 계정만 구글 캘린더 연동을 사용할 수 있다. 시도 전에 알 수 있도록
 * 랜딩에 얇은 배너로 노출한다.
 */
export default function GcalTestingNotice() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900 sm:flex-row sm:items-start sm:gap-4">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden />
        <div className="space-y-1.5">
          <p className="font-medium text-amber-950">
            구글 캘린더 연동은 현재 개발자 등록 사용자에게만 제공됩니다
          </p>
          <p className="text-xs leading-relaxed">
            본 앱은 아직 앱 심사 전 단계라 개발자가 직접 허용한 Google 계정만 캘린더 연동을
            쓸 수 있습니다. 앱 내 일정 조회·편집은 누구나 정상 사용할 수 있으며, 캘린더
            연동 등록을 원하시면 아래 링크로 요청해 주세요.
          </p>
          <a
            href={GCAL_DISCUSSIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-950 underline underline-offset-2"
          >
            개발자에게 문의 (토론)
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
