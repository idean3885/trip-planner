/**
 * spec 025 (#417, hotfix v2.11.5) — 미연결 trip의 캘린더 provider 선택 카드.
 *
 * 표시 조건: link 부재 + OWNER (호출 측에서 처리).
 * 옵션:
 *  - Apple iCloud (권장) — 위자드 진입
 *  - Google Calendar (개발자 등록 필요) — Testing 모드 제약 안내 + 등록 사용자만
 *    `?provider=google` 쿼리로 진입 → trip 페이지가 GCalLinkPanel 노출
 *
 * spec 024 Clarification 6 정책: 한 trip = 1 provider · 1 외부 캘린더.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { GCAL_DISCUSSIONS_URL } from "@/lib/gcal/unregistered";

interface CalendarProviderChoiceProps {
  tripId: number;
}

export default function CalendarProviderChoice({
  tripId,
}: CalendarProviderChoiceProps) {
  return (
    <Card className="p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">캘린더 연결</h3>
        <p className="text-xs text-muted-foreground">
          모바일 Calendar 앱에서 여행 일정을 보려면 캘린더를 연결하세요. 한 여행은
          1개 캘린더만 연결할 수 있습니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {/* Apple — 권장 */}
        <Link
          href={`/trips/${tripId}/calendar/connect-apple`}
          className="block rounded-lg border-2 border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">🍎 Apple iCloud</span>
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  권장
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                iPhone·iPad·Mac Calendar 앱 사용자에게 권장. 앱 전용 암호 1번 발급
                후 즉시 사용.
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-primary">
              연결 →
            </span>
          </div>
        </Link>

        {/* Google — Testing 모드 (등록 사용자 진입 경로 명시) */}
        <Link
          href={`/trips/${tripId}?provider=google`}
          scroll={false}
          className="block rounded-lg border border-input bg-background p-3 transition-colors hover:bg-accent"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">📅 Google Calendar</span>
                <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                  Testing
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                개발자에게 등록된 사용자만 통과합니다. 등록되어 있다면 바로 시도하세요.
                미등록 시 동의 단계에서 차단되며 안내가 노출됩니다.
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-foreground">
              시작 →
            </span>
          </div>
        </Link>

        {/* 등록 문의 보조 링크 (Google 박스 밖, 작은 footer 톤) */}
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Google 등록이 필요하다면{" "}
          <a
            href={GCAL_DISCUSSIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            토론 채널로 문의
          </a>
          하세요.
        </p>
      </div>
    </Card>
  );
}
