'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useInceptionCosmo } from './useInceptionCosmo'
import { SECTIONS, type Answers, type Path, type Build } from '@/lib/inception/schema'

export type Step = 'origin' | 'chooser' | 'interview' | 'export'
const STORAGE_KEY = 'inception:v1'

type Persisted = {
  step: Step
  path?: Path
  build?: Build
  answers: Answers
  edited: string[]
  dayZero: string
  activeSection: string
}

type InceptionValue = {
  step: Step
  setStep: (s: Step) => void
  path?: Path
  build?: Build
  setPath: (p: Path) => void
  setBuild: (b: Build) => void
  answers: Answers
  onField: <K extends keyof Answers>(id: K, value: Answers[K]) => void
  dayZero: string
  activeSection: string
  setActiveSection: (id: string) => void
  startInterview: () => void
  reset: () => void
  cosmo: ReturnType<typeof useInceptionCosmo>
}

const Ctx = createContext<InceptionValue | null>(null)

export function useInception(): InceptionValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInception must be used within InceptionProvider')
  return v
}

export function InceptionProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<Step>('origin')
  const [path, setPath] = useState<Path | undefined>()
  const [build, setBuild] = useState<Build | undefined>()
  const [answers, setAnswers] = useState<Answers>({})
  const [edited, setEdited] = useState<string[]>([])
  const [dayZero, setDayZero] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [hydrated, setHydrated] = useState(false)

  const answersRef = useRef(answers)
  answersRef.current = answers
  const sectionRef = useRef(activeSection)
  sectionRef.current = activeSection
  const editedRef = useRef(edited)
  editedRef.current = edited

  // Merge synthesized fields without clobbering anything the user edited.
  const mergeSynthesized = (incoming: Partial<Answers>) => {
    setAnswers((prev) => {
      const next: Answers = { ...prev }
      for (const [k, v] of Object.entries(incoming)) {
        if (v == null) continue
        if (typeof v === 'string' && !v.trim()) continue
        if (Array.isArray(v) && v.length === 0) continue
        if (editedRef.current.includes(k)) continue
        // @ts-expect-error — keyed assignment from a validated partial
        next[k] = v
      }
      return next
    })
  }

  const cosmo = useInceptionCosmo({
    path: path ?? 'agent',
    build: build ?? 'no-code',
    getStep: () => sectionRef.current,
    getAnswers: () => answersRef.current,
    onSynthesized: ({ answers: a, dayZeroEntry }) => {
      mergeSynthesized(a)
      if (dayZeroEntry) setDayZero(dayZeroEntry)
    },
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Persisted
        setStep(p.step ?? 'origin')
        setPath(p.path)
        setBuild(p.build)
        setAnswers(p.answers ?? {})
        setEdited(p.edited ?? [])
        setDayZero(p.dayZero ?? '')
        setActiveSection(p.activeSection ?? '')
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      const data: Persisted = { step, path, build, answers, edited, dayZero, activeSection }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }, [hydrated, step, path, build, answers, edited, dayZero, activeSection])

  const onField = <K extends keyof Answers>(id: K, value: Answers[K]) => {
    setAnswers((a) => ({ ...a, [id]: value }))
    setEdited((e) => (e.includes(id as string) ? e : [...e, id as string]))
  }

  const startInterview = () => {
    if (path && !activeSection) setActiveSection(SECTIONS[path][0].id)
    setStep('interview')
  }

  // Clear everything entered and return to the start.
  const reset = () => {
    setPath(undefined)
    setBuild(undefined)
    setAnswers({})
    setEdited([])
    setDayZero('')
    setActiveSection('')
    setStep('origin')
    cosmo.clear()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  const value: InceptionValue = {
    step,
    setStep,
    path,
    build,
    setPath,
    setBuild,
    answers,
    onField,
    dayZero,
    activeSection,
    setActiveSection,
    startInterview,
    reset,
    cosmo,
  }

  if (!hydrated) return <div className="flex-1" />
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
