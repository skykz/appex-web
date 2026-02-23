import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@shared/lib'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shared/ui'
import { onboardingSteps, aiModels, actionChips } from './mock-data'

const STORAGE_KEY = 'ai_tools_onboarding_seen'

export function AIToolsOnboardingDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function handleNext() {
    if (step < onboardingSteps.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  const current = onboardingSteps[step]
  const isFirst = step === 0
  const isLast = step === onboardingSteps.length - 1

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm overflow-hidden p-0" hideClose>
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {!isFirst && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg p-1 transition-colors hover:bg-muted active:scale-95"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <span className="text-sm font-medium text-muted-foreground">
            Getting started
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center px-5 pb-5 pt-4 text-center">
          <DialogTitle className="text-lg font-bold">
            {current.title}
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            {current.description}
          </DialogDescription>

          {/* Step preview */}
          <div className="mt-4 w-full rounded-xl bg-primary/5 p-4">
            <StepPreview step={step} />
          </div>

          {/* Dots */}
          <div className="mt-4 flex gap-1.5">
            {onboardingSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'size-1.5 rounded-full transition-all',
                  i === step ? 'w-4 bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleNext}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            {isFirst ? 'Try AI tools' : isLast ? 'Get started' : 'Continue'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StepPreview({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        {aiModels.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-1.5 text-sm"
          >
            <span>{m.icon}</span>
            <span className="font-medium">{m.name}</span>
          </div>
        ))}
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {[
          'Evaluate this business idea',
          'Write copy',
          'Tips to boost productivity',
          'Give advice',
          'Explain simply',
          'Summarize text',
          'Translate',
          '10 marketing chatbot ideas',
        ].map((label) => (
          <span
            key={label}
            className="rounded-full bg-background/60 px-3 py-1.5 text-xs font-medium"
          >
            {label}
          </span>
        ))}
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {['🎨', '🌄', '🏙️', '🌸', '🎭', '🖌️'].map((emoji, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-lg bg-background/60 text-2xl"
          >
            {emoji}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-semibold">How can I help you?</p>
      <div className="flex w-full items-center gap-2 rounded-xl bg-background/60 px-3 py-2">
        <span className="flex-1 text-left text-xs text-muted-foreground">
          Ask anything...
        </span>
        <span className="text-xs">{aiModels[0].icon}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {actionChips.slice(0, 4).map((c) => (
          <span
            key={c.id}
            className="rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-medium"
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
