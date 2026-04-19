import { landingTechStack } from "@/lib/landing-content";

export default function TechStack() {
  return (
    <section aria-labelledby="stack-heading" className="py-8">
      <h2
        id="stack-heading"
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        기술 스택
      </h2>
      <div className="mt-4 space-y-4">
        {landingTechStack.map(({ label, items }) => (
          <div key={label}>
            <h3 className="text-xs font-semibold text-foreground">{label}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
