import type { CurrencySummary, KrwConversion } from "@/lib/expense";

/**
 * spec 061 US4 (#811) — 금액 합산 표시.
 * 통화별 총액 + 사전/현장 소계. 빈 합산은 렌더하지 않는다(잡음 방지).
 *
 * spec 062 — 원화 자동 근사 환산 병기. `krw`가 주어지고 환산 기여분이 있으면
 * 통화 라인 뒤에 "약 …원 (참고)"을 덧붙인다. 환율 미확보분이 있으면 일부만
 * 반영됐음을 표기한다. 원화는 참고 근사치다(정산 정확값 아님).
 */
export function ExpenseSummary({
  rows,
  label,
  krw,
}: {
  rows: CurrencySummary[];
  label: string;
  krw?: KrwConversion | null;
}) {
  if (rows.length === 0) return null;
  const showKrw = krw != null && krw.anyConverted;
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-foreground font-medium">{label}</span>
      {rows.map((r) => (
        <span key={r.currency} className="tabular-nums">
          <span className="text-foreground">
            {r.total.toLocaleString()} {r.currency}
          </span>
          {r.advance > 0 && r.onSite > 0 && (
            <span className="text-muted-foreground/70">
              {" "}
              (사전 {r.advance.toLocaleString()} · 현장{" "}
              {r.onSite.toLocaleString()})
            </span>
          )}
        </span>
      ))}
      {showKrw && (
        <span className="text-muted-foreground/80 tabular-nums">
          약 {krw.krw.toLocaleString()}원{" "}
          <span className="text-muted-foreground/60">
            (참고{krw.partial ? " · 일부 통화만" : ""})
          </span>
        </span>
      )}
    </div>
  );
}
