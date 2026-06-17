'use client'

import {
  Button,
  cn,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@opencosmos/ui'
import { BlueprintPanel } from '../BlueprintPanel'
import { SECTIONS, PATH_META, type Answers, type Path } from '@/lib/inception/schema'

/**
 * The interview's main column — one section per page. Cosmo conducts the interview
 * from the left sidebar and her turns fill this blueprint; every field is editable.
 */
export function Interview({
  path,
  answers,
  activeSection,
  setActiveSection,
  onField,
  onFinish,
  onBack,
  onReset,
}: {
  path: Path
  answers: Answers
  activeSection: string
  setActiveSection: (id: string) => void
  onField: <K extends keyof Answers>(id: K, value: Answers[K]) => void
  onFinish: () => void
  onBack: () => void
  onReset: () => void
}) {
  const sections = SECTIONS[path]
  const idx = Math.max(0, sections.findIndex((s) => s.id === activeSection))
  const isFirst = idx === 0
  const isLast = idx === sections.length - 1

  const goBack = () => (isFirst ? onBack() : setActiveSection(sections[idx - 1].id))
  const goNext = () => (isLast ? onFinish() : setActiveSection(sections[idx + 1].id))

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Progress header — section chips double as a jump control. */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap">
        <span className="text-xs uppercase tracking-[0.2em] text-foreground/40">{PATH_META[path].label} · inception</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cn('text-sm rounded-full px-3 py-1 transition-colors', s.id === activeSection ? 'bg-surface text-foreground' : 'text-foreground/40 hover:text-foreground/70')}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-foreground/40">Section {idx + 1} of {sections.length}</span>
      </div>

      {/* The form — one section, with navigation at its foot. */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-base text-foreground/55 mb-8 leading-relaxed">
            Talk with Cosmo on the left — she draws this out of you, and it fills in here as you go. Or type into
            any field yourself; your words always win.
          </p>

          <BlueprintPanel path={path} answers={answers} activeSection={activeSection} onField={onField} />

          {/* Navigation — at the bottom of the form. */}
          <div className="mt-12 flex items-center gap-3 border-t border-border pt-6">
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-foreground/50 hover:text-foreground">
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears every answer you&rsquo;ve entered and your conversation with Cosmo, and returns to
                    the start. This can&rsquo;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onReset}>Reset everything</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button className="ml-auto" onClick={goNext}>
              {isLast ? 'Finish & generate' : 'Next section'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
