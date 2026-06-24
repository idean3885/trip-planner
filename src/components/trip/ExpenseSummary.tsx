import type { CurrencySummary } from "@/lib/expense";

/**
 * spec 061 US4 (#811) — 금액 합산 표시.
 * 통화별 총액 + 사전/현장 소계. 빈 합산은 렌더하지 않는다(잡음 방지).
 */
export function ExpenseSummary({
  rows,
  label,
}: {
  rows: CurrencySummary[];
  label: string;
}) {
  if (rows.length === 0) return null;
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
    </div>
  );
}
