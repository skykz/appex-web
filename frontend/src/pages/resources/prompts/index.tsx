import { useState, useMemo } from 'react'
import { Search, FileText } from 'lucide-react'
import { cn } from '@shared/lib'

const categories = [
  'Basic Applications',
  'Productivity',
  'Sales',
  'E-Commerce',
  'Investing',
  'Development',
  'No Code',
  'Prompt Engineering',
  'SaaS',
  'Customer Support',
  'Conversion Rate Optimization',
  'Product Management',
  'Human Resources',
  'Act As',
] as const

type Category = (typeof categories)[number]

interface Prompt {
  id: number
  title: string
  category: Category
}

const mockPrompts: Prompt[] = [
  // Basic Applications
  { id: 1, title: 'Blog Writing', category: 'Basic Applications' },
  { id: 2, title: 'Writing An Email', category: 'Basic Applications' },
  { id: 3, title: 'Digital Marketing: Basics', category: 'Basic Applications' },
  { id: 4, title: 'Study Buddy', category: 'Basic Applications' },
  { id: 5, title: 'AI Image Generation', category: 'Basic Applications' },
  { id: 6, title: 'Content Creation Frameworks', category: 'Basic Applications' },
  { id: 7, title: 'Online Business: Basics', category: 'Basic Applications' },
  { id: 8, title: 'Midjourney', category: 'Basic Applications' },
  { id: 9, title: 'Resume & Cover Letter', category: 'Basic Applications' },
  // Productivity
  { id: 10, title: 'Task Prioritization', category: 'Productivity' },
  { id: 11, title: 'Meeting Summaries', category: 'Productivity' },
  { id: 12, title: 'Weekly Planning', category: 'Productivity' },
  { id: 13, title: 'Email Templates', category: 'Productivity' },
  { id: 14, title: 'Time Management', category: 'Productivity' },
  { id: 15, title: 'Habit Tracking', category: 'Productivity' },
  // Sales
  { id: 16, title: 'Cold Outreach', category: 'Sales' },
  { id: 17, title: 'Sales Pitch Generator', category: 'Sales' },
  { id: 18, title: 'Objection Handling', category: 'Sales' },
  // E-Commerce
  { id: 19, title: 'Product Descriptions', category: 'E-Commerce' },
  { id: 20, title: 'Store Optimization', category: 'E-Commerce' },
  { id: 21, title: 'Customer Reviews', category: 'E-Commerce' },
  // Investing
  { id: 22, title: 'Stock Analysis', category: 'Investing' },
  { id: 23, title: 'Portfolio Strategy', category: 'Investing' },
  { id: 24, title: 'Market Research', category: 'Investing' },
  // Development
  { id: 25, title: 'Code Review', category: 'Development' },
  { id: 26, title: 'API Design', category: 'Development' },
  { id: 27, title: 'Debug Helper', category: 'Development' },
  // No Code
  { id: 28, title: 'Zapier Workflows', category: 'No Code' },
  { id: 29, title: 'n8n Automations', category: 'No Code' },
  { id: 30, title: 'Airtable Formulas', category: 'No Code' },
  // Prompt Engineering
  { id: 31, title: 'Chain-of-Thought', category: 'Prompt Engineering' },
  { id: 32, title: 'Few-Shot Examples', category: 'Prompt Engineering' },
  { id: 33, title: 'System Prompts', category: 'Prompt Engineering' },
  // SaaS
  { id: 34, title: 'Feature Announcements', category: 'SaaS' },
  { id: 35, title: 'Onboarding Emails', category: 'SaaS' },
  { id: 36, title: 'Churn Prevention', category: 'SaaS' },
  // Customer Support
  { id: 37, title: 'FAQ Generator', category: 'Customer Support' },
  { id: 38, title: 'Ticket Responses', category: 'Customer Support' },
  { id: 39, title: 'Knowledge Base', category: 'Customer Support' },
  // CRO
  { id: 40, title: 'A/B Test Ideas', category: 'Conversion Rate Optimization' },
  { id: 41, title: 'Landing Page Copy', category: 'Conversion Rate Optimization' },
  { id: 42, title: 'CTA Optimization', category: 'Conversion Rate Optimization' },
  // Product Management
  { id: 43, title: 'PRD Templates', category: 'Product Management' },
  { id: 44, title: 'User Stories', category: 'Product Management' },
  { id: 45, title: 'Roadmap Planning', category: 'Product Management' },
  // Human Resources
  { id: 46, title: 'Job Descriptions', category: 'Human Resources' },
  { id: 47, title: 'Interview Questions', category: 'Human Resources' },
  { id: 48, title: 'Performance Reviews', category: 'Human Resources' },
  // Act As
  { id: 49, title: 'Act As Consultant', category: 'Act As' },
  { id: 50, title: 'Act As Mentor', category: 'Act As' },
  { id: 51, title: 'Act As Editor', category: 'Act As' },
]

export default function PromptsLibraryPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  const filtered = useMemo(() => {
    let result = mockPrompts
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q))
    }
    return result
  }, [search, activeCategory])

  // Group by category for display
  const grouped = useMemo(() => {
    const map = new Map<Category, Prompt[]>()
    for (const p of filtered) {
      const list = map.get(p.category) ?? []
      list.push(p)
      map.set(p.category, list)
    }
    // Preserve category order
    const ordered: { category: Category; prompts: Prompt[] }[] = []
    for (const cat of categories) {
      const prompts = map.get(cat)
      if (prompts && prompts.length > 0) {
        ordered.push({ category: cat, prompts })
      }
    }
    return ordered
  }, [filtered])

  return (
    <div className="relative min-h-dvh w-full py-2">
      <div className="px-4">
        {/* Header */}
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4" />
          <span className="text-sm font-medium">Prompts library</span>
        </div>

        <h1 className="mb-5 text-2xl font-bold tracking-tight">
          Prompts library
        </h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full rounded-xl border bg-card py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setActiveCategory(activeCategory === cat ? null : cat)
              }
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                activeCategory === cat
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grouped prompt cards */}
        {grouped.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No prompts found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-8">
            {grouped.map(({ category, prompts }) => (
              <div key={category}>
                <h2 className="mb-3 text-lg font-bold">{category}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      className="rounded-xl border bg-card px-4 py-5 text-left text-sm font-medium transition-all hover:border-primary/30 hover:shadow-sm active:scale-[0.99]"
                    >
                      {prompt.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
