import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { landingFeatures } from "@/lib/landing-content";

export default function FeatureHighlights() {
  return (
    <section aria-labelledby="features-heading" className="py-8">
      <h2
        id="features-heading"
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        할 수 있는 것
      </h2>
      <div className="mt-4 space-y-3">
        {landingFeatures.map(({ icon: Icon, title, summary, bullets }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{summary}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-muted-foreground/70"
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
