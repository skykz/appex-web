import { useState, useMemo } from 'react'
import {
  SkillCard,
  SkillCategoryTabs,
  SkillsOnboardingDialog,
  mockSkills,
  type SkillCategory,
} from '@features/skills'

export default function SkillsPage() {
  const [category, setCategory] = useState<SkillCategory>('all')

  const filtered = useMemo(
    () =>
      category === 'all'
        ? mockSkills
        : mockSkills.filter((s) => s.category === category),
    [category]
  )

  return (
    <>
      <div className="relative min-h-dvh w-full py-2">
        <div className="px-4">
          <div className="mb-5">
            <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          </div>

          {/* Category tabs */}
          <div className="mb-5">
            <SkillCategoryTabs value={category} onChange={setCategory} />
          </div>

          {/* Skills grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </div>
      </div>

      <SkillsOnboardingDialog />
    </>
  )
}
