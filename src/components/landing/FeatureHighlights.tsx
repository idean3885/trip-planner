import Image from "next/image";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { landingFeatures } from "@/lib/landing-content";

export default function FeatureHighlights() {
  return (
    <section aria-labelledby="features-heading" className="py-8">
      <h2
        id="features-heading"
        className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
      >
        계획부터 현장까지, 이렇게 돕습니다
      </h2>
      <div className="mt-4 space-y-3">
        {landingFeatures.map(({ image, title, summary, bullets }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Image
                  src={image}
                  alt=""
                  aria-hidden
                  width={512}
                  height={512}
                  className="mt-0.5 size-14 shrink-0"
                />
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
