const roles = [
  "AI Automation Specialist",
  "AI Agent Builder",
  "AI Content Operator",
  "AI Workflow Consultant",
  "AI Operations Manager",
  "AI Solutions Architect",
];

const items = [...roles, ...roles];

export default function RoleTicker() {
  return (
    <div className="bg-card py-5 md:py-8 overflow-hidden group border-y border-border">
      <div className="flex whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 items-center">
            {items.map((role, i) => (
              <span key={`${set}-${i}`} className="flex items-center text-sm md:text-base font-semibold uppercase tracking-wider text-foreground/80">
                <span className="mx-3 md:mx-5 text-primary text-xs">◆</span>
                {role}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
