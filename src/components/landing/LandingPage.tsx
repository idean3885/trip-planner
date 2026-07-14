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
      <Separator />
      <BottomCta isLoggedIn={isLoggedIn} />
    </article>
  );
}
