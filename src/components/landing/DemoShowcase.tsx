import { Clock, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// 랜딩 데모: 실제 DB 없이도 shadcn 토큰으로 실 UI를 보여주는 정적 프리뷰.
// 스크린샷 자산(public/landing/*.png)이 추가되면 대체 가능.

export default function DemoShowcase() {
  return (
    <section aria-labelledby="demo-heading" className="py-8">
      <h2
        id="demo-heading"
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        이렇게 보입니다
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        실제 제품과 동일한 디자인 토큰·컴포넌트로 구성된 미리보기입니다.
      </p>

      <div className="mt-4 space-y-4">
        {/* 여행 목록 프리뷰 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">
            여행 목록 (trips)
          </p>
          <div className="space-y-3">
            <Card className="pointer-events-none">
              <CardHeader>
                <CardTitle className="text-base">
                  포르투갈·스페인 2주
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">2026-06-07 ~ 2026-06-20</span>
                  <span aria-hidden>·</span>
                  <span>14일</span>
                  <span aria-hidden>·</span>
                  <span className="font-medium text-foreground">내 여행</span>
                </div>
                <span className="text-xs font-medium text-foreground">
                  일정 보기 →
                </span>
              </CardContent>
            </Card>
            <Card className="pointer-events-none">
              <CardHeader>
                <CardTitle className="text-base">도쿄 3박 4일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">2026-09-05 ~ 2026-09-08</span>
                  <span aria-hidden>·</span>
                  <span>4일</span>
                  <span aria-hidden>·</span>
                  <span className="font-medium text-foreground">호스트</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 일자별 활동 프리뷰 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">
            DAY 상세 · 활동 카드
          </p>
          <Card className="pointer-events-none">
            <CardHeader>
              <CardTitle className="text-base">DAY 3 · 리스본</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="tabular-nums">09:00 — 11:00</span>
                <span className="font-medium">벨렘탑 관광</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                <span>Torre de Belém, Lisboa</span>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                예약 권장 · 성인 €8 · 현장 구매 가능
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
