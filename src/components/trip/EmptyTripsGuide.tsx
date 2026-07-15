import { ArrowRight, Bot, ExternalLink, PencilLine } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { projectMeta } from "@/lib/project-meta";

/**
 * 로그인 직후 빈 여행 목록에 노출되는 빠른 시작 안내. 첫 여행을 어떻게
 * 시작하는지 물음이 생기는 자리에서 두 사용 경로를 바로 안내한다(#903).
 * 캡처 없이 텍스트 중심 — 화면 변화에 따른 유지보수 부담을 피한다.
 */
export default function EmptyTripsGuide() {
  return (
    <section aria-labelledby="quickstart-heading" className="py-8">
      <h2
        id="quickstart-heading"
        className="text-base font-semibold tracking-tight"
      >
        아직 만든 여행이 없어요
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        두 가지 방법으로 시작할 수 있습니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="bg-foreground/5 text-foreground mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full">
                <PencilLine className="size-4" aria-hidden />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-base leading-snug font-medium">
                  직접 만들기
                </h3>
                <p className="text-muted-foreground text-sm">
                  여행 → 날짜 → 활동을 웹에서 직접 추가합니다.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/trips/new" />}>
              새 여행 만들기
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="bg-foreground/5 text-foreground mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full">
                <Bot className="size-4" aria-hidden />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-base leading-snug font-medium">
                  AI에게 맡기기
                </h3>
                <p className="text-muted-foreground text-sm">
                  Claude에게 &quot;제주 2박 3일&quot;처럼 말하면 숙소·활동을
                  대신 찾아 일정에 넣습니다.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              nativeButton={false}
              render={
                <a
                  href={`${projectMeta.githubUrl}/blob/main/mcp/README.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              연결 방법 보기
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
