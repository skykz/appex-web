import { Link } from 'react-router-dom'
import { Gift, Newspaper } from 'lucide-react'
import { cn } from '@shared/lib'
import { HOME_OFFERS_NEWS_ITEMS, type HomeOffersNewsItem } from './home-offers-news-items'

/**
 * Renders one scroll-snap card for an offer or news item in the home sidebar feed.
 */
function FeedCard({ item }: { item: HomeOffersNewsItem }) {
  const isOffer = item.kind === 'offer'

  return (
    <Link
      to={item.href}
      className={cn(
        'flex min-w-[11.5rem] max-w-[11.5rem] shrink-0 snap-start flex-col rounded-xl border p-3.5 shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md',
        isOffer
          ? 'border-primary/25 bg-gradient-to-br from-primary/[0.1] via-amber-50/60 to-card hover:border-primary/40 dark:from-primary/15 dark:via-orange-950/35'
          : 'border-border/80 bg-card hover:border-border'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            isOffer
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isOffer ? (
            <Gift className="size-3" aria-hidden />
          ) : (
            <Newspaper className="size-3" aria-hidden />
          )}
          {isOffer ? 'Offer' : 'News'}
        </span>
        {item.badge ? (
          <span className="text-primary text-[10px] font-semibold">{item.badge}</span>
        ) : null}
        {item.dateLabel && !item.badge ? (
          <span className="text-muted-foreground text-[10px] font-medium">
            {item.dateLabel}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</p>
      <p className="text-muted-foreground mt-1.5 line-clamp-3 text-xs leading-relaxed">
        {item.description}
      </p>
    </Link>
  )
}

/**
 * Horizontally scrollable offers and news strip for the home dashboard sidebar.
 */
export function HomeOffersNewsSection() {
  return (
    <section
      className="rounded-2xl border border-border/70 bg-muted/25 p-4 shadow-sm"
      aria-labelledby="home-offers-news-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          id="home-offers-news-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Offers & news
        </h2>
        <span className="text-muted-foreground text-[10px] font-medium">
          Swipe for more
        </span>
      </div>

      <div className="scrollbar-hide -mx-0.5 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {HOME_OFFERS_NEWS_ITEMS.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
