'use client'

import { cn } from '@opencosmos/ui'
import { SECTIONS, DOMAIN_PACKS, type Answers, type Path, type FieldDef, type Goal, type Teacher, type DomainPackId } from '@/lib/inception/schema'

const inputCls =
  'w-full bg-transparent text-base text-foreground placeholder:text-foreground/25 outline-none border border-foreground/15 rounded-lg px-3 py-2.5 focus:border-foreground/35 transition-colors'

function FieldLabel({ field, filled }: { field: FieldDef; filled: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label className="text-base font-medium text-foreground">{field.label}</label>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 transition-colors', filled ? 'bg-foreground/60' : 'bg-foreground/15')} />
    </div>
  )
}

function ListEditor({ value, placeholder, onChange }: { value?: string[]; placeholder?: string; onChange: (v: string[]) => void }) {
  return (
    <textarea
      rows={3}
      value={(value ?? []).join('\n')}
      placeholder={placeholder ? `${placeholder}\n(one per line)` : 'One per line'}
      onChange={(e) => onChange(e.target.value.split('\n'))}
      className={cn(inputCls, 'resize-y leading-relaxed')}
    />
  )
}

function GoalsEditor({ value, onChange }: { value?: Goal[]; onChange: (v: Goal[]) => void }) {
  const goals = value && value.length ? value : [{ name: '', ambition: '', targets: [], liveWork: '' }]
  const update = (i: number, patch: Partial<Goal>) => onChange(goals.map((g, n) => (n === i ? { ...g, ...patch } : g)))
  return (
    <div className="space-y-4">
      {goals.map((g, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-foreground/40">Goal {i + 1}</span>
            {goals.length > 1 && (
              <button type="button" onClick={() => onChange(goals.filter((_, n) => n !== i))} className="text-sm text-foreground/40 hover:text-foreground/70">
                Remove
              </button>
            )}
          </div>
          <input className={inputCls} placeholder="A clear outcome, not a vague theme" value={g.name} onChange={(e) => update(i, { name: e.target.value })} />
          <textarea rows={2} className={cn(inputCls, 'resize-y')} placeholder="Ambition — why it matters, traced to your north star" value={g.ambition} onChange={(e) => update(i, { ambition: e.target.value })} />
          <textarea rows={2} className={cn(inputCls, 'resize-y')} placeholder="Targets — measurable (one per line)" value={(g.targets ?? []).join('\n')} onChange={(e) => update(i, { targets: e.target.value.split('\n') })} />
          <input className={inputCls} placeholder="Live work — where the actual work lives" value={g.liveWork} onChange={(e) => update(i, { liveWork: e.target.value })} />
        </div>
      ))}
      {goals.length < 5 && (
        <button type="button" onClick={() => onChange([...goals, { name: '', ambition: '', targets: [], liveWork: '' }])} className="text-base text-foreground/50 hover:text-foreground/80">
          + Add a goal
        </button>
      )}
    </div>
  )
}

function TeachersEditor({ value, onChange }: { value?: Teacher[]; onChange: (v: Teacher[]) => void }) {
  const teachers = value && value.length ? value : [{ name: '', carries: '', touchstone: '' }]
  const update = (i: number, patch: Partial<Teacher>) => onChange(teachers.map((t, n) => (n === i ? { ...t, ...patch } : t)))
  return (
    <div className="space-y-4">
      {teachers.map((t, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-foreground/40">Teacher {i + 1}</span>
            {teachers.length > 1 && (
              <button type="button" onClick={() => onChange(teachers.filter((_, n) => n !== i))} className="text-sm text-foreground/40 hover:text-foreground/70">
                Remove
              </button>
            )}
          </div>
          <input className={inputCls} placeholder="Who they are (a coach, author, tradition…)" value={t.name} onChange={(e) => update(i, { name: e.target.value })} />
          <textarea rows={2} className={cn(inputCls, 'resize-y')} placeholder="What you carry from them" value={t.carries} onChange={(e) => update(i, { carries: e.target.value })} />
          <input className={inputCls} placeholder="Touchstone (optional)" value={t.touchstone ?? ''} onChange={(e) => update(i, { touchstone: e.target.value })} />
        </div>
      ))}
      {teachers.length < 7 && (
        <button type="button" onClick={() => onChange([...teachers, { name: '', carries: '', touchstone: '' }])} className="text-base text-foreground/50 hover:text-foreground/80">
          + Add a teacher
        </button>
      )}
    </div>
  )
}

function PacksEditor({ value, onChange }: { value?: DomainPackId[]; onChange: (v: DomainPackId[]) => void }) {
  const selected = value ?? []
  const toggle = (id: DomainPackId) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <div className="flex flex-wrap gap-2">
      {DOMAIN_PACKS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => toggle(p.id)}
          aria-pressed={selected.includes(p.id)}
          className={cn(
            'rounded-full border px-3.5 py-2 text-base transition-colors',
            selected.includes(p.id) ? 'border-foreground/40 bg-surface text-foreground' : 'border-border text-foreground/60 hover:border-foreground/25',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function isFilled(field: FieldDef, answers: Answers): boolean {
  const v = answers[field.id]
  if (Array.isArray(v)) return v.some((x) => (typeof x === 'string' ? x.trim() : x && Object.values(x).some((s) => String(s).trim())))
  return typeof v === 'string' ? v.trim().length > 0 : v != null
}

// Renders ONE section (the active page). Pagination lives in the Interview step.
export function BlueprintPanel({
  path,
  answers,
  activeSection,
  onField,
}: {
  path: Path
  answers: Answers
  activeSection: string
  onField: <K extends keyof Answers>(id: K, value: Answers[K]) => void
}) {
  const sections = SECTIONS[path]
  const section = sections.find((s) => s.id === activeSection) ?? sections[0]

  return (
    <div>
      <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
      <p className="mt-1.5 text-sm text-foreground/55 leading-relaxed">{section.intro}</p>

      <div className="mt-6 space-y-6">
        {section.fields.map((field) => (
          <div key={field.id as string} className="space-y-2">
            <FieldLabel field={field} filled={isFilled(field, answers)} />
            <p className="text-sm text-foreground/45 leading-relaxed">{field.helper}</p>

            {field.kind === 'text' && (
              <input className={inputCls} placeholder={field.placeholder} value={(answers[field.id] as string) ?? ''} onChange={(e) => onField(field.id, e.target.value as Answers[typeof field.id])} />
            )}
            {field.kind === 'textarea' && (
              <textarea rows={3} className={cn(inputCls, 'resize-y leading-relaxed')} placeholder={field.placeholder} value={(answers[field.id] as string) ?? ''} onChange={(e) => onField(field.id, e.target.value as Answers[typeof field.id])} />
            )}
            {field.kind === 'list' && (
              <ListEditor value={answers[field.id] as string[]} placeholder={field.placeholder} onChange={(v) => onField(field.id, v as Answers[typeof field.id])} />
            )}
            {field.kind === 'goals' && <GoalsEditor value={answers.goals} onChange={(v) => onField('goals', v)} />}
            {field.kind === 'teachers' && <TeachersEditor value={answers.teachers} onChange={(v) => onField('teachers', v)} />}
            {field.kind === 'packs' && <PacksEditor value={answers.domainPacks} onChange={(v) => onField('domainPacks', v)} />}
          </div>
        ))}
      </div>
    </div>
  )
}
