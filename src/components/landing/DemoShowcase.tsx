import { Clock, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 랜딩 데모: 실제 DB 없이도 shadcn 토큰으로 실 UI를 보여주는 정적 프리뷰.
// 스크린샷 자산(public/landing/*.png)이 추가되면 대체 가능.

export default function DemoShowcase() {
  return (
    <section aria-labelledby="demo-heading" className="py-8">
      <h2
        id="demo-heading"
        className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
      >
        이렇게 보입니다
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        실제 제품과 동일한 디자인 토큰·컴포넌트로 구성된 미리보기입니다.
      </p>

      <div className="mt-4 space-y-4">
        {/* 여행 목록 프리뷰 */}
        <div>
          <p className="text-foreground mb-2 text-xs font-semibold">
            여행 목록 (trips)
          </p>
          <div className="space-y-3">
            <Card className="pointer-events-none">
              <CardHeader>
                <CardTitle className="text-base">포르투갈·스페인 2주</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="tabular-nums">2026-06-07 ~ 2026-06-20</span>
                  <span aria-hidden>·</span>
                  <span>14일</span>
                  <span aria-hidden>·</span>
                  <span className="text-foreground font-medium">내 여행</span>
                </div>
                <span className="text-foreground text-xs font-medium">
                  일정 보기 →
                </span>
              </CardContent>
            </Card>
            <Card className="pointer-events-none">
              <CardHeader>
                <CardTitle className="text-base">도쿄 3박 4일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="tabular-nums">2026-09-05 ~ 2026-09-08</span>
                  <span aria-hidden>·</span>
                  <span>4일</span>
                  <span aria-hidden>·</span>
                  <span className="text-foreground font-medium">호스트</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 일자별 활동 프리뷰 */}
        <div>
          <p className="text-foreground mb-2 text-xs font-semibold">
            DAY 상세 · 활동 카드
          </p>
          <Card className="pointer-events-none">
            <CardHeader>
              <CardTitle className="text-base">DAY 3 · 리스본</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="text-muted-foreground size-3.5" aria-hidden />
                <span className="tabular-nums">09:00 — 11:00</span>
                <span className="font-medium">벨렘탑 관광</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin
                  className="text-muted-foreground size-3.5"
                  aria-hidden
                />
                <span>Torre de Belém, Lisboa</span>
              </div>
              <div className="border-border bg-muted/40 text-muted-foreground rounded-md border p-2 text-xs">
                예약 권장 · 성인 €8 · 현장 구매 가능
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
