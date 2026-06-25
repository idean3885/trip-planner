import { InfoHint } from "@/components/ui/info-hint";
import type { CurrencySummary, KrwConversion } from "@/lib/expense";

/** 기준 환율을 "1 EUR ≈ 1,480원" 한 줄로. 소수 둘째 자리까지. */
function rateLine(currency: string, perUnitKrw: number): string {
  return `1 ${currency} ≈ ${perUnitKrw.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}원`;
}

/** 환산 기준 도움말 본문: 적용 기준 환율 + 한 줄 설명. */
function buildHint(krw: KrwConversion): string {
  const lines = krw.rates.map((r) => rateLine(r.currency, r.perUnitKrw));
  // 핵심만: 환율 기준(일별 종가)과 성격(자동 환산·참고용). 실거래가가 아님을 한 줄로.
  lines.push("일별 종가 기준 자동 환산 · 참고용");
  return lines.join("\n");
}

/**
 * spec 061 US4 (#811) — 금액 합산 표시.
 * 통화별 총액 + 사전/현장 소계. 빈 합산은 렌더하지 않는다(잡음 방지).
 *
 * spec 062 — 원화 자동 근사 환산 병기. `krw`가 주어지고 환산 기여분이 있으면
 * 통화 라인 뒤에 "약 …원"과 환산 기준을 설명하는 "?" 말풍선(InfoHint)을 붙인다.
 * 일부 통화만 환산됐으면 그 사실을 함께 표기한다. 원화는 참고 근사치다.
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
        <span className="text-muted-foreground/80 inline-flex items-center gap-1 tabular-nums">
          <span>약 {krw.krw.toLocaleString()}원</span>
          {krw.partial && (
            <span className="text-muted-foreground/60">(일부 통화만)</span>
          )}
          <InfoHint label="원화 환산 기준 설명" text={buildHint(krw)} />
        </span>
      )}
    </div>
  );
}
