import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame, Gift } from 'lucide-react'
import { Button } from '@shared/ui'
import { StreakSheet } from '@features/streak'
import { streakApi } from '@features/streak/api'

/**
 * Home dashboard block: streak summary + sheet, and a placeholder for time-limited offers.
 */
export function HomeStreakPromoSection() {
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.get(),
    staleTime: 30_000,
  })

  const current = streak?.current ?? 0
  const best = streak?.best ?? 0

  return (
    <>
      <StreakSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border-2 border-orange-200/70 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-sm dark:border-orange-500/30 dark:from-orange-950/60 dark:to-background">
          <div className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
            <Flame className="size-5 shrink-0 text-orange-500" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-wide">Streak</p>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-orange-700 dark:text-orange-300">
            {current}
            <span className="text-muted-foreground ml-1 text-sm font-semibold">days</span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Best: <span className="font-semibold text-foreground">{best}</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setSheetOpen(true)}
          >
            Streak details
          </Button>
        </div>

        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-2 text-primary">
            <Gift className="size-4 shrink-0" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-wide">Offers</p>
          </div>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Limited-time course bundles and discounts will appear here.
          </p>
        </div>
      </div>
    </>
  )
}
