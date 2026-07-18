import { Separator } from "@/components/ui/separator";

import BottomCta from "./BottomCta";
import DemoShowcase from "./DemoShowcase";
import FeatureHighlights from "./FeatureHighlights";
import GcalTestingNotice from "./GcalTestingNotice";
import Hero from "./Hero";

export default function LandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <article className="space-y-2">
      <Hero isLoggedIn={isLoggedIn} />
      <Separator />
      <FeatureHighlights />
      <Separator />
      <DemoShowcase />
      {/* 로그인 사용자는 상단 Hero CTA로 일원화 — 하단 반복 CTA는 비로그인 전환 퍼널에만 노출 */}
      {!isLoggedIn && (
        <>
          <Separator />
          <BottomCta />
        </>
      )}
      {/* spec 070 — 구글 캘린더 제한 고지를 최종 CTA 뒤(하단)로 옮긴다. 전환 직전
          부정 신호를 없애고 정보는 유지한다. */}
      <Separator />
      <GcalTestingNotice />
    </article>
  );
}
