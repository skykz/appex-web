import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame } from 'lucide-react'
import { cn } from '@shared/lib'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@shared/ui'
import { StreakCalendar } from './streak-calendar'
import { streakApi } from './api'

interface StreakCalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal with streak count in the top-left and the month calendar as the only content.
 */
export function StreakCalendarDialog({
  open,
  onOpenChange,
}: StreakCalendarDialogProps) {
  const [calendarMonth, setCalendarMonth] = React.useState(() =>
    new Date().toISOString().slice(0, 7)
  )

  React.useEffect(() => {
    if (open) {
      setCalendarMonth(new Date().toISOString().slice(0, 7))
    }
  }, [open])

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.get(),
    enabled: open,
  })

  const { data: calendar } = useQuery({
    queryKey: ['streak-calendar', calendarMonth],
    queryFn: () => streakApi.getCalendar(calendarMonth),
    enabled: open,
  })

  const current = streak?.current ?? 0
  const activeDays = React.useMemo(
    () => new Set(calendar?.activeDays ?? []),
    [calendar?.activeDays]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Streak calendar</DialogTitle>
        <DialogDescription className="sr-only">
          Monthly view of your learning streak activity
        </DialogDescription>

        <div className="flex items-center justify-between px-4 pb-2 pt-4 pr-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-sm font-bold tabular-nums shadow-sm">
            {current}
            <Flame
              className={cn(
                'size-4',
                current > 0 ? 'text-orange-500' : 'text-muted-foreground/50'
              )}
              aria-hidden
            />
          </span>
        </div>

        <div className="px-3 pb-4 pt-1">
          <StreakCalendar
            activeDays={activeDays}
            monthKey={calendarMonth}
            onMonthKeyChange={setCalendarMonth}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
