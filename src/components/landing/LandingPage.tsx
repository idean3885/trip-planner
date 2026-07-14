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
      <Separator />
      <GcalTestingNotice />
      {/* 로그인 사용자는 상단 Hero CTA로 일원화 — 하단 반복 CTA는 비로그인 전환 퍼널에만 노출 */}
      {!isLoggedIn && (
        <>
          <Separator />
          <BottomCta />
        </>
      )}
    </article>
  );
}
