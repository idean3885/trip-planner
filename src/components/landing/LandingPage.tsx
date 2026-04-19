import { Separator } from "@/components/ui/separator";
import Hero from "./Hero";
import ValueProps from "./ValueProps";
import FeatureHighlights from "./FeatureHighlights";
import TechStack from "./TechStack";
import DemoShowcase from "./DemoShowcase";
import BottomCta from "./BottomCta";

export default function LandingPage() {
  return (
    <article className="space-y-2">
      <Hero />
      <Separator />
      <ValueProps />
      <Separator />
      <FeatureHighlights />
      <Separator />
      <TechStack />
      <Separator />
      <DemoShowcase />
      <Separator />
      <BottomCta />
    </article>
  );
}
