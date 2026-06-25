import { ExpenseSummary } from "@/components/trip/ExpenseSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDateFull } from "@/lib/date-utils";
import type { CurrencySummary, KrwConversion } from "@/lib/expense";

/**
 * spec 063 — 여행 개요(종합정보).
 *
 * 기간·일수·인원·총 사용 금액·설명을 한 자리에 모은다. 일정(캘린더)을
 * 대체하지 않는 보조 요약 — 상세 화면 상단 섹션으로 둔다. 설명이 없어도
 * 종합정보(기간·인원·총액)는 항상 보인다. 금액은 기존 합산·환율 규칙을 따른다.
 */
export function TripOverviewCard({
  startDate,
  endDate,
  dayCount,
  memberCount,
  tripSummary,
  tripKrw,
  descriptionHtml,
}: {
  startDate: Date | null;
  endDate: Date | null;
  dayCount: number;
  memberCount: number;
  tripSummary: CurrencySummary[];
  tripKrw?: KrwConversion | null;
  descriptionHtml: string | null;
}) {
  const hasPeriod = startDate != null && endDate != null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>여행 개요</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 종합정보 — 설명이 없어도 항상 보인다. */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {hasPeriod ? (
            <span className="text-foreground tabular-nums">
              {formatCalendarDateFull(startDate)} ~{" "}
              {formatCalendarDateFull(endDate)}
            </span>
          ) : (
            <span className="text-foreground font-medium">일정 미정</span>
          )}
          <span aria-hidden>·</span>
          <span>{dayCount}일</span>
          <span aria-hidden>·</span>
          <span>{memberCount}명</span>
        </div>

        {tripSummary.length > 0 && (
          <ExpenseSummary
            rows={tripSummary}
            label="총 사용 금액"
            krw={tripKrw}
          />
        )}

        {descriptionHtml && (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
      </CardContent>
    </Card>
  );
}
