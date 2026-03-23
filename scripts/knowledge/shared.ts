/**
 * Shared types, constants, and utilities for knowledge CLI tools.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Load .env ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '..', '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.+?)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const ROLES = ['source', 'commentary', 'reference', 'guide', 'collection'] as const
export const FORMATS = [
  'treatise', 'poetry', 'aphorisms', 'scripture', 'dialogue', 'essay',
  'manifesto', 'specification', 'manual', 'narrative', 'glossary', 'anthology', 'letter',
] as const
export const DOMAINS = [
  'buddhism', 'stoicism', 'sufism', 'taoism', 'vedic', 'indigenous', 'philosophy',
  'ecology', 'science', 'psychology', 'literature', 'art', 'engineering', 'ai',
  'opencosmos', 'cross',
] as const
export const AUDIENCES = ['philosopher', 'engineer', 'scientist', 'artist', 'contemplative', 'creator', 'general'] as const
export const COMPLEXITIES = ['foundational', 'intermediate', 'advanced'] as const

export const KNOWLEDGE_DIR = resolve(__dirname, '..', '..', 'knowledge')

// ─── Types ──────────────────────────────────────────────────────────────────

export type Role = (typeof ROLES)[number]
export const ERAS = ['ancient', 'medieval', 'early-modern', 'modern', 'contemporary'] as const

export type Frontmatter = {
  title: string
  role: Role
  format: string
  domain: string
  tags: string[]
  audience: string[]
  complexity: string
  summary: string
  curated_at: string
  curator: string
  source: string
  // Optional enriched fields
  author?: string
  origin_date?: string
  era?: string
  tradition?: string
  related_docs?: string[]
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function parseJsonResponse(text: string): Partial<Frontmatter> | null {
  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─── Corpus Scanning ────────────────────────────────────────────────────────

export type CorpusEntry = {
  /** Relative path from knowledge/ dir, e.g. "sources/buddhism-the-dhammapada.md" */
  relativePath: string
  frontmatter: Partial<Frontmatter>
}

const CORPUS_SUBDIRS = ['sources', 'commentary', 'references', 'guides', 'collections']

/**
 * Parse YAML frontmatter from a markdown string without external dependencies.
 * Handles the common subset needed for corpus scanning.
 */
function parseFrontmatterRaw(raw: string): Record<string, unknown> {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return {}

  const yaml = fmMatch[1]
  const result: Record<string, unknown> = {}

  let currentKey = ''
  let currentArray: string[] | null = null

  for (const line of yaml.split('\n')) {
    // Array item (  - value)
    const arrayItem = line.match(/^\s+-\s+(.+)$/)
    if (arrayItem && currentKey) {
      if (!currentArray) currentArray = []
      currentArray.push(arrayItem[1].replace(/^["']|["']$/g, ''))
      result[currentKey] = currentArray
      continue
    }

    // Inline array: key: [a, b, c]
    const inlineArray = line.match(/^(\w[\w_]*)\s*:\s*\[([^\]]*)\]/)
    if (inlineArray) {
      currentKey = inlineArray[1]
      currentArray = null
      result[currentKey] = inlineArray[2].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
      continue
    }

    // Key: value
    const kv = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      currentArray = null
      const val = kv[2].trim().replace(/^["']|["']$/g, '')
      if (val && val !== '>' && val !== '|') {
        result[currentKey] = val
      }
      continue
    }

    // Multi-line continuation (summary, etc.) — store as string
    if (currentKey && line.match(/^\s{2,}\S/)) {
      const prev = result[currentKey]
      const trimmed = line.trim()
      result[currentKey] = prev ? `${prev} ${trimmed}` : trimmed
    }
  }

  return result
}

/**
 * Scan all knowledge documents and return their frontmatter.
 * Fast — only parses YAML frontmatter, skips body content.
 */
export function scanCorpus(): CorpusEntry[] {
  const entries: CorpusEntry[] = []

  for (const subdir of CORPUS_SUBDIRS) {
    const dir = resolve(KNOWLEDGE_DIR, subdir)
    if (!existsSync(dir)) continue

    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue
      const fullPath = resolve(dir, file)
      try {
        const raw = readFileSync(fullPath, 'utf-8')
        const data = parseFrontmatterRaw(raw)
        entries.push({
          relativePath: `${subdir}/${file}`,
          frontmatter: data as Partial<Frontmatter>,
        })
      } catch {
        // Skip malformed files
      }
    }
  }

  return entries
}
