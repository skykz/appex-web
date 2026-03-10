import { useState, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { Sparkles } from 'lucide-react'

const STORAGE_KEY = 'skills_onboarding_seen'

export function SkillsOnboardingDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm p-6" hideClose>
        <div className="flex flex-col items-center text-center">
          {/* Blue icon */}
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-7 text-primary" />
          </div>

          <DialogTitle className="text-xl font-bold">
            Skills on demand, in addition to your plan
          </DialogTitle>
          <DialogDescription className="mt-2">
            Explore AI skills you can learn and practice at your own pace
          </DialogDescription>

          {/* Preview card */}
          <div className="mt-5 w-full rounded-xl border border-dashed border-border/60 bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📧</span>
              <div className="text-left">
                <p className="text-sm font-semibold">Build Gmail Manager Bot</p>
                <span className="inline-block rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600">
                  Completed
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleClose}
            size="xl"
            className="mt-6 w-full"
          >
            Get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
