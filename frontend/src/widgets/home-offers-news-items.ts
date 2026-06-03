export type HomeFeedItemKind = 'offer' | 'news'

export interface HomeOffersNewsItem {
  id: string
  kind: HomeFeedItemKind
  title: string
  description: string
  href: string
  /** Shown on news cards, e.g. "Jun 3" */
  dateLabel?: string
  /** Optional pill on offer cards, e.g. "Limited" */
  badge?: string
}

/**
 * Sidebar feed entries until a CMS or API backs offers and announcements.
 */
export const HOME_OFFERS_NEWS_ITEMS: HomeOffersNewsItem[] = [
  {
    id: 'intro-plan',
    kind: 'offer',
    title: 'Intro plan discount',
    description: 'Unlock full access with a limited-time yearly offer.',
    href: '/settings?section=plan',
    badge: 'Limited',
  },
  {
    id: 'bundle-ai',
    kind: 'offer',
    title: 'AI automation bundle',
    description: 'Combine fundamentals and workflow courses at a lower price.',
    href: '/skills',
    badge: 'New',
  },
  {
    id: 'news-streak',
    kind: 'news',
    title: 'Weekly streak goals',
    description: 'Track activity day by day and build momentum on your plan.',
    href: '/home',
    dateLabel: 'Today',
  },
  {
    id: 'news-tools',
    kind: 'news',
    title: 'AI tools workspace',
    description: 'New prompts and assistants are rolling out in the tools section.',
    href: '/ai-tools',
    dateLabel: 'This week',
  },
]
