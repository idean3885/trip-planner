import { Separator } from "@/components/ui/separator";

import BottomCta from "./BottomCta";
import DemoShowcase from "./DemoShowcase";
import FeatureHighlights from "./FeatureHighlights";
import GcalTestingNotice from "./GcalTestingNotice";
import Hero from "./Hero";
import ValueProps from "./ValueProps";

export default function LandingPage() {
  return (
    <article className="space-y-2">
      <Hero />
      <Separator />
      <ValueProps />
      <Separator />
      <FeatureHighlights />
      <Separator />
      <DemoShowcase />
      <Separator />
      <GcalTestingNotice />
      <Separator />
      <BottomCta />
    </article>
  );
}
