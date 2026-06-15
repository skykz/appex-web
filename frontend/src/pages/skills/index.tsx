import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  SkillCard,
  SkillCategoryTabs,
  SkillSection,
  SkillsHero,
  SkillsOnboardingDialog,
  skillsApi,
  categorySectionCopy,
  skillCategories,
  type SkillListItem,
  type SkillNavTab,
} from '@features/skills'
import { SectionLoader } from '@shared/ui'

const CHALLENGE_SECTION_ID = 'challenge'

/**
 * Builds anchor tabs for the challenge block plus each category that has courses.
 */
function buildSectionTabs(
  categoriesWithSkills: { slug: string; label: string }[],
  includeChallenge: boolean
): SkillNavTab[] {
  const tabs: SkillNavTab[] = []
  if (includeChallenge) {
    tabs.push({ id: CHALLENGE_SECTION_ID, label: 'Challenges' })
  }
  for (const category of categoriesWithSkills) {
    tabs.push({ id: `section-${category.slug}`, label: category.label })
  }
  return tabs
}

/**
 * Skills catalog page — hero, underline tabs, and vertically stacked category sections.
 */
export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState('')

  const { data: skills = [], isPending, isError, refetch } = useQuery({
    queryKey: ['skills', 'all'],
    queryFn: () => skillsApi.list('all'),
  })

  const featuredSkill = skills[0] ?? null
  const remainingSkills = featuredSkill ? skills.slice(1) : skills

  const categoriesWithSkills = useMemo(() => {
    const slugs = new Set(remainingSkills.map((skill) => skill.category))
    return skillCategories
      .filter((category) => category.value !== 'all' && slugs.has(category.value))
      .map((category) => ({ slug: category.value, label: category.label }))
  }, [remainingSkills])

  const skillsByCategory = useMemo(() => {
    const grouped = new Map<string, SkillListItem[]>()
    for (const skill of remainingSkills) {
      const list = grouped.get(skill.category) ?? []
      list.push(skill)
      grouped.set(skill.category, list)
    }
    return grouped
  }, [remainingSkills])

  const tabs = useMemo(
    () => buildSectionTabs(categoriesWithSkills, !!featuredSkill),
    [categoriesWithSkills, featuredSkill]
  )

  useEffect(() => {
    if (!tabs.length) return
    setActiveTab((current) =>
      current && tabs.some((tab) => tab.id === current) ? current : tabs[0].id
    )
  }, [tabs])

  /**
   * Smooth-scrolls the selected section into view below the sticky tab bar.
   */
  function scrollToSection(sectionId: string) {
    setActiveTab(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!tabs.length) return

    const sectionIds = tabs.map((tab) => tab.id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) {
          setActiveTab(visible[0].target.id)
        }
      },
      {
        root: null,
        rootMargin: '-35% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    for (const id of sectionIds) {
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    }

    return () => observer.disconnect()
  }, [tabs, skills.length])

  return (
    <>
      <div className="relative min-h-dvh w-full py-4 sm:py-6">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <SkillsHero />

          {tabs.length > 0 ? (
            <div className="sticky top-0 z-20 -mx-4 mb-8 bg-background/95 px-4 pb-0 pt-2 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <SkillCategoryTabs
                tabs={tabs}
                activeId={activeTab}
                onSelect={scrollToSection}
              />
            </div>
          ) : null}

          {isPending ? (
            <SectionLoader label="Loading skills…" />
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm font-medium text-destructive">
                We couldn&apos;t load skills. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 inline-flex rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                Retry
              </button>
            </div>
          ) : skills.length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 py-16 text-center">
              <p className="text-sm text-muted-foreground">No courses available yet.</p>
            </div>
          ) : (
            <div className="space-y-2 pb-10">
              {featuredSkill ? (
                <SkillSection
                  id={CHALLENGE_SECTION_ID}
                  title="Challenge"
                  description="Short, focused challenges to build momentum and learn fast."
                >
                  <SkillCard skill={featuredSkill} featured />
                </SkillSection>
              ) : null}

              {categoriesWithSkills.map((category) => {
                const items = skillsByCategory.get(category.slug) ?? []
                if (!items.length) return null

                return (
                  <SkillSection
                    key={category.slug}
                    id={`section-${category.slug}`}
                    title={category.label}
                    description={categorySectionCopy[category.slug]}
                  >
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((skill) => (
                        <SkillCard key={skill.id} skill={skill} />
                      ))}
                    </div>
                  </SkillSection>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <SkillsOnboardingDialog />
    </>
  )
}
