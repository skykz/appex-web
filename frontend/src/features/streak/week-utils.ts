/** Short labels for a Monday-first week row. */
export const WEEK_DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

export interface WeekDayCell {
  /** ISO date `YYYY-MM-DD` in local calendar */
  date: string
  label: (typeof WEEK_DAY_LABELS)[number]
  isToday: boolean
}

/**
 * Returns the seven days of the current local week (Monday through Sunday).
 */
export function getCurrentWeekDays(): WeekDayCell[] {
  const now = new Date()
  const jsDay = now.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
  const todayKey = formatLocalDate(now)

  return WEEK_DAY_LABELS.map((label, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
    const dateKey = formatLocalDate(date)
    return { date: dateKey, label, isToday: dateKey === todayKey }
  })
}

/**
 * Formats a date as `YYYY-MM-DD` using the local timezone.
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Counts how many days in the current week appear in the active-day set.
 */
export function countActiveDaysThisWeek(activeDays: Set<string>): number {
  return getCurrentWeekDays().filter((day) => activeDays.has(day.date)).length
}
