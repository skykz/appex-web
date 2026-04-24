import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@shared/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
}

export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
