"use client";

/**
 * spec 028 섹션 1 — provider 선택·연결 상태.
 *
 * v2.16.0 첫 회차는 wrapping 전략: 기존 `CalendarProviderChoice`/`GCalLinkPanel`/`AppleEntryCard`의
 * 진입 경로(연결 안내·재동의·해제)를 inline 안내 + 외부 페이지 링크로 표현한다. depth 0 정책에
 * 부합하도록 다이얼로그를 닫지 않고 안내·링크만 노출하며, 실제 OAuth·CalDAV 연결은 외부 페이지에서
 * 일어난 후 redirect로 복귀(`?calsync=open`).
 */

import Link from "next/link";
import type { TripRole } from "@prisma/client";

interface Props {
  tripId: number;
  role: TripRole;
  linked: boolean;
  provider: "GOOGLE" | "APPLE" | null;
  providerHint: "google" | null;
  onLinkChanged: (next: { linked: boolean; provider: "GOOGLE" | "APPLE" | null }) => void;
}

export default function ProviderSection({
  tripId,
  role,
  linked,
  provider,
  providerHint,
}: Props) {
  const canManage = role === "OWNER";

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold">캘린더 연결</h4>

      {linked ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>
              <span className="font-medium">
                {provider === "APPLE" ? "Apple iCloud" : "Google"} 캘린더
              </span>
              <span className="ml-2 text-xs text-muted-foreground">연결됨</span>
            </span>
            {canManage && (
              <Link
                href={`/trips/${tripId}?calsync=open`}
                className="text-xs underline text-muted-foreground hover:text-foreground"
              >
                상세 관리
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            여행 일정을 trip-planner에서 추가·수정하면 연결된 캘린더에도 반영됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {canManage ? (
            <>
              <p className="text-xs text-muted-foreground">
                모바일 Calendar 앱에서 여행 일정을 보려면 캘린더를 연결하세요. 한 여행은 1개 캘린더만 연결할 수 있습니다.
              </p>
              {!providerHint && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href={`/trips/${tripId}/calendar/connect-apple?return=${encodeURIComponent(`/trips/${tripId}?calsync=open`)}`}
                    className="rounded-md border-2 border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
                  >
                    <div className="text-sm font-medium">🍎 Apple iCloud (권장)</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      iPhone·iPad·Mac 사용자에게 권장. 앱 전용 암호 1회 발급 후 사용.
                    </p>
                  </Link>
                  <Link
                    href={`/trips/${tripId}?provider=google&calsync=open`}
                    className="rounded-md border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="text-sm font-medium">📅 Google Calendar</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      개발자가 등록한 Google 계정에서만 동작합니다.
                    </p>
                  </Link>
                </div>
              )}
              {providerHint === "google" && (
                <p className="text-xs text-muted-foreground">
                  Google 연결 흐름이 진행 중입니다. 페이지 상단의 캘린더 연결 안내를 따라 진행한 뒤 이 다이얼로그가 자동으로 다시 열립니다.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              주인(OWNER)만 캘린더 연결을 시작할 수 있습니다.
            </p>
          )}
        </div>
      )}

      {linked && canManage && (
        <div className="mt-3">
          <Link
            href={`/trips/${tripId}?calsync=open#manage`}
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            연결 해제·재연결
          </Link>
        </div>
      )}
    </section>
  );
}
