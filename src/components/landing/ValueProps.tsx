import { Card, CardContent } from "@/components/ui/card";
import { landingValues } from "@/lib/landing-content";

export default function ValueProps() {
  return (
    <section aria-labelledby="values-heading" className="py-8">
      <h2
        id="values-heading"
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        이 프로젝트가 주는 것
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {landingValues.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardContent className="space-y-2 py-5">
              <div className="inline-flex size-9 items-center justify-center rounded-full bg-foreground/5 text-foreground">
                <Icon className="size-4" aria-hidden />
              </div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
