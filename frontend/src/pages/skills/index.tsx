import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  SkillCard,
  SkillCategoryTabs,
  SkillsOnboardingDialog,
  skillsApi,
  type SkillCategoryFilter,
} from '@features/skills'

/**
 * Skills catalog page — loads courses from the API with category filters.
 */
export default function SkillsPage() {
  const [category, setCategory] = useState<SkillCategoryFilter>('all')

  const { data: skills = [], isPending, isError, refetch } = useQuery({
    queryKey: ['skills', category],
    queryFn: () => skillsApi.list(category),
  })

  const filtered = useMemo(() => skills, [skills])

  return (
    <>
      <div className="relative min-h-dvh w-full py-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />
        <div className="relative px-4">
          <div className="mb-6 rounded-2xl border border-border/60 bg-card/80 px-4 py-5 shadow-sm backdrop-blur-sm sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Skills
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Learn practical automations and AI workflows at your pace
            </p>
          </div>

          <div className="mb-5">
            <SkillCategoryTabs value={category} onChange={setCategory} />
          </div>

          {isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border bg-muted/40"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm font-medium text-destructive">
                We couldn&apos;t load skills. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 inline-flex rounded-xl border-2 border-primary/40 bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/60 hover:bg-primary/[0.06]"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                No courses in this category yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SkillsOnboardingDialog />
    </>
  )
}
