const roles = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Make",
  "Zapier",
  "n8n",
  "Midjourney",
  "Notion AI",
];

const items = [...roles, ...roles];

export default function RoleTicker() {
  return (
    <div className="bg-card py-8 md:py-12 overflow-hidden group border-y border-border">
      <p className="text-center text-primary uppercase text-[11px] tracking-[0.2em] font-semibold mb-5 md:mb-7 font-body px-4">
        Built around the AI tools professionals use
      </p>

      {/* Mobile: static centered pills — no marquee */}
      <div className="md:hidden flex flex-wrap justify-center gap-2 px-4">
        {roles.map((role) => (
          <span
            key={role}
            className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/80 bg-background border border-border"
          >
            {role}
          </span>
        ))}
      </div>

      {/* Desktop: marquee */}
      <div className="hidden md:flex whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 items-center">
            {items.map((role, i) => (
              <span key={`${set}-${i}`} className="flex items-center text-base md:text-lg font-semibold uppercase tracking-wider text-foreground/80">
                <span className="mx-4 md:mx-7 text-primary text-xs">◆</span>
                {role}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
