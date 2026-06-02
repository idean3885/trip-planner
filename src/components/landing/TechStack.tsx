import { landingTechStack } from "@/lib/landing-content";

export default function TechStack() {
  return (
    <section aria-labelledby="stack-heading" className="py-8">
      <h2
        id="stack-heading"
        className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
      >
        기술 스택
      </h2>
      <div className="mt-4 space-y-4">
        {landingTechStack.map(({ label, items }) => (
          <div key={label}>
            <h3 className="text-foreground text-xs font-semibold">{label}</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <li
                  key={item}
                  className="border-border bg-background text-muted-foreground rounded-full border px-2.5 py-1 text-xs"
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
