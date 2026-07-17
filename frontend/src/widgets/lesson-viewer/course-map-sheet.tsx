import { useNavigate } from 'react-router-dom'
import { Map } from 'lucide-react'
import { Button } from '@shared/ui'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@shared/ui/sheet'
import type { CourseMapOutline } from './course-outline'
import { CourseMapLessonList } from './course-map-lesson-list'

type CourseMapSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  outline: CourseMapOutline
}

/**
 * Slide-over listing modules and lessons with lock/current/completed states; navigates via router.
 */
export function CourseMapSheet({ open, onOpenChange, outline }: CourseMapSheetProps) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(100vw-2rem,22rem)] flex-col border-l-2 border-border p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/80 px-5 pb-4 pt-6 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Map className="size-4" aria-hidden />
            </div>
            <div>
              <SheetTitle className="text-base leading-tight">Course map</SheetTitle>
              <SheetDescription className="line-clamp-2 text-left text-xs">
                {outline.courseTitle}
              </SheetDescription>
            </div>
          </div>
          <p className="text-muted-foreground pt-2 text-xs leading-relaxed">
            Complete each lesson in order to unlock the next. Tap a lesson to open it.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <CourseMapLessonList
            outline={outline}
            navigateOnSelect={false}
            density="comfortable"
            onSelectLesson={(lessonId) => {
              navigate(outline.hrefForLesson(lessonId))
              onOpenChange(false)
            }}
          />
        </div>

        <div className="border-t border-border/80 p-4">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
