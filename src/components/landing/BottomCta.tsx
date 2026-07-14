import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * 대문 하단 반복 CTA. 비로그인 전환 퍼널에서만 노출된다(로그인 사용자는
 * 상단 Hero CTA로 일원화 — LandingPage에서 조건 렌더). GitHub·소개 링크는
 * Footer가 상시 제공하므로 여기서는 두지 않는다.
 */
export default function BottomCta() {
  return (
    <section aria-labelledby="cta-heading" className="py-8">
      <h2
        id="cta-heading"
        className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
      >
        시작해 볼까요
      </h2>
      <div className="mt-4 space-y-3">
        <p className="text-muted-foreground text-sm">
          Google 계정으로 로그인하면 바로 여행을 만들 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/auth/signin?callbackUrl=/trips" />}
          >
            시작하기
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}
