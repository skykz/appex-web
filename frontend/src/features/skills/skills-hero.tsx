export function SkillsHero() {
  return (
    <div className="mb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center lg:gap-10">
      <div className="min-w-0">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Skills
        </h1>
        <p className="mt-3 text-lg font-medium text-foreground/90 sm:text-xl">
          Master one skill per course
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          A library of focused courses. Each one teaches a single, practical skill you
          can use right away.
        </p>
      </div>

      <img
        src="/animations/skills-hero-animated.gif"
        alt=""
        className="mx-auto h-[225px] w-full max-w-[360px] rounded-[24px] border border-border/50 object-cover shadow-sm lg:mx-0 lg:max-w-none"
      />
    </div>
  )
}
