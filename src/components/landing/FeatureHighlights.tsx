import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { landingFeatures } from "@/lib/landing-content";

export default function FeatureHighlights() {
  return (
    <section aria-labelledby="features-heading" className="py-8">
      <h2
        id="features-heading"
        className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
      >
        여행 준비를 이렇게 돕습니다
      </h2>
      <div className="mt-4 space-y-3">
        {landingFeatures.map(({ icon: Icon, title, summary, bullets }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="bg-foreground/5 text-foreground mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-base leading-snug font-medium">
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-sm">{summary}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground space-y-1.5 text-sm">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="bg-muted-foreground/70 mt-[0.55rem] size-1 shrink-0 rounded-full"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
