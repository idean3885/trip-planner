"use client";

/**
 * spec 028 섹션 1 — provider 선택·연결 상태.
 *
 * v2.16.0 첫 회차는 wrapping 전략: 기존 `CalendarProviderChoice`/`GCalLinkPanel`/`AppleEntryCard`의
 * 진입 경로(연결 안내·재동의·해제)를 inline 안내 + 외부 페이지 링크로 표현한다. depth 0 정책에
 * 부합하도록 다이얼로그를 닫지 않고 안내·링크만 노출하며, 실제 OAuth·CalDAV 연결은 외부 페이지에서
 * 일어난 후 redirect로 복귀(`?calsync=open`).
 */

import type { TripRole } from "@prisma/client";
import Link from "next/link";

interface Props {
  tripId: number;
  role: TripRole;
  linked: boolean;
  provider: "GOOGLE" | "APPLE" | null;
  calendarName: string | null;
  providerHint: "google" | null;
  onLinkChanged: (next: {
    linked: boolean;
    provider: "GOOGLE" | "APPLE" | null;
    name: string | null;
  }) => void;
}

export default function ProviderSection({
  tripId,
  role,
  linked,
  provider,
  calendarName,
  providerHint,
}: Props) {
  const canManage = role === "OWNER";
  const providerLabel = provider === "APPLE" ? "Apple iCloud" : "Google";

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold">동기화 상태</h4>

      {linked ? (
        <div className="bg-muted/30 rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>
              <span className="font-medium">{providerLabel}</span>
              {calendarName && (
                <span className="ml-2 font-medium">· {calendarName}</span>
              )}
              <span className="text-muted-foreground ml-2 text-xs">
                동기화 작동 중
              </span>
            </span>
            {canManage && (
              <Link
                href={`/trips/${tripId}?calsync=open`}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                상세 관리
              </Link>
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            trip-planner에서 여행 일정을 추가·수정하면 위 캘린더에 자동으로
            반영됩니다(별도 조작 없음). 외부 캘린더에 이미 쌓아둔 일정을
            가져오고 싶다면 아래 &ldquo;외부 캘린더에서 일정 가져오기&rdquo;를
            펼치세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {canManage ? (
            <>
              <p className="text-muted-foreground text-xs">
                모바일 Calendar 앱에서 여행 일정을 보려면 캘린더를 연결하세요.
                한 여행은 1개 캘린더만 연결할 수 있습니다.
              </p>
              {!providerHint && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href={`/trips/${tripId}/calendar/connect-apple?return=${encodeURIComponent(`/trips/${tripId}?calsync=open`)}`}
                    className="border-primary/40 bg-primary/5 hover:bg-primary/10 rounded-md border-2 p-3 transition-colors"
                  >
                    <div className="text-sm font-medium">
                      🍎 Apple iCloud (권장)
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      iPhone·iPad·Mac 사용자에게 권장. 앱 전용 암호 1회 발급 후
                      사용.
                    </p>
                  </Link>
                  <Link
                    href={`/trips/${tripId}?provider=google&calsync=open`}
                    className="hover:bg-accent rounded-md border p-3 transition-colors"
                  >
                    <div className="text-sm font-medium">
                      📅 Google Calendar
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      개발자가 등록한 Google 계정에서만 동작합니다.
                    </p>
                  </Link>
                </div>
              )}
              {providerHint === "google" && (
                <p className="text-muted-foreground text-xs">
                  Google 연결 흐름이 진행 중입니다. 페이지 상단의 캘린더 연결
                  안내를 따라 진행한 뒤 이 다이얼로그가 자동으로 다시 열립니다.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              주인(OWNER)만 캘린더 연결을 시작할 수 있습니다.
            </p>
          )}
        </div>
      )}

      {linked && canManage && (
        <div className="mt-3">
          <Link
            href={`/trips/${tripId}?calsync=open#manage`}
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            연결 해제·재연결
          </Link>
        </div>
      )}
    </section>
  );
}
