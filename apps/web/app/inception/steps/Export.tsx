'use client'

import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator, cn } from '@opencosmos/ui'
import {
  fillBrief,
  renderIdentity,
  renderGoals,
  renderTeachers,
  renderLog,
  briefFilename,
} from '@/lib/inception/templates'
import { verbatimAssetsFor, fetchAsset } from '@/lib/inception/assets'
import { recipeFor } from '@/lib/inception/recipes'
import { PATH_META, type Answers, type Path, type Build } from '@/lib/inception/schema'

type Doc = { zipPath: string; label: string; content: string }

function buildGeneratedDocs(path: Path, build: Build, answers: Answers, dayZeroEntry: string): Doc[] {
  // Brief is filled by the caller (needs the fetched template); placeholder here.
  const date = new Date().toISOString().slice(0, 10)
  const docs: Doc[] = [{ zipPath: 'brain/identity.md', label: 'identity.md', content: renderIdentity(answers, path) }]
  if (path === 'agent') docs.push({ zipPath: 'brain/goals.md', label: 'goals.md', content: renderGoals(answers) })
  if (path === 'catalyst') docs.push({ zipPath: 'brain/teachers.md', label: 'teachers.md', content: renderTeachers(answers) })
  docs.push({ zipPath: 'brain/log.md', label: 'log.md', content: renderLog(answers, path, dayZeroEntry, date) })
  return docs
}

export function Export({
  path,
  build,
  answers,
  dayZeroEntry,
  onBack,
}: {
  path: Path
  build: Build
  answers: Answers
  dayZeroEntry: string
  onBack: () => void
}) {
  const [brief, setBrief] = useState<Doc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zipping, setZipping] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const recipe = recipeFor(path, build)
  const name = answers.name?.trim() || 'you'

  useEffect(() => {
    let cancelled = false
    fetchAsset(`/inception/templates/${path}-brief.md`)
      .then((raw) => {
        if (cancelled) return
        setBrief({ zipPath: briefFilename(build), label: briefFilename(build), content: fillBrief(raw, path, answers) })
      })
      .catch(() => !cancelled && setError('Could not load the brief template. Refresh to try again.'))
    return () => {
      cancelled = true
    }
  }, [path, build, answers])

  const generatedDocs = brief ? [brief, ...buildGeneratedDocs(path, build, answers, dayZeroEntry)] : []

  const copy = async (label: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(label)
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500)
    } catch {
      /* ignore */
    }
  }

  const downloadZip = async () => {
    if (!brief) return
    setZipping(true)
    try {
      const zip = new JSZip()
      for (const d of generatedDocs) zip.file(d.zipPath, d.content)
      const assets = verbatimAssetsFor(path, build)
      const fetched = await Promise.all(
        assets.map(async (a) => ({ zipPath: a.zipPath, content: await fetchAsset(a.url).catch(() => '') })),
      )
      for (const f of fetched) if (f.content) zip.file(f.zipPath, f.content)

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `synth-${name.toLowerCase().replace(/\s+/g, '-')}-${path}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not build the download. You can still copy each doc below.')
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40 mb-3">It&rsquo;s ready</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Synthetic {name} — your {PATH_META[path].label}
        </h1>
        <p className="mt-3 text-foreground/70 leading-relaxed">
          Here is everything your agent needs. Now give it a home — it goes with you, free, and arrives already
          remembering how it came to be. Below is the recipe for the build you chose.
        </p>
      </div>

      {error && <p className="text-base text-foreground/60 border border-border rounded-lg px-4 py-3">{error}</p>}

      {/* Move it into its home */}
      <Card>
        <CardHeader>
          <CardTitle>{recipe.title}</CardTitle>
          <CardDescription>Send your agent home. First words: &ldquo;{recipe.firstWords}.&rdquo;</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-base text-foreground/75 leading-relaxed">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-foreground/50">
            <span className="text-foreground/70">The one gotcha:</span> {recipe.gotcha}
          </p>
          <Separator className="my-4" />
          <Button onClick={downloadZip} disabled={!brief || zipping}>
            {zipping ? 'Preparing…' : 'Download your kit (.zip)'}
          </Button>
        </CardContent>
      </Card>

      {/* The generated docs — copy individually */}
      <div className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.2em] text-foreground/40">Your documents</h2>
        {generatedDocs.map((d) => (
          <div key={d.label} className="rounded-xl border border-border">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-base font-medium text-foreground">{d.label}</span>
              <Button variant="ghost" size="sm" onClick={() => copy(d.label, d.content)}>
                {copied === d.label ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className={cn('max-h-56 overflow-auto border-t border-border px-4 py-3 text-sm text-foreground/60 whitespace-pre-wrap leading-relaxed')}>
              {d.content.slice(0, 1200)}
              {d.content.length > 1200 ? '\n…' : ''}
            </pre>
          </div>
        ))}
        {!brief && !error && <p className="text-base text-foreground/40">Assembling your documents…</p>}
      </div>

      <Button variant="ghost" onClick={onBack}>
        Back to the interview
      </Button>
    </div>
  )
}
