/**
 * Shared types, constants, and utilities for knowledge CLI tools.
 */

import { readFileSync, existsSync } from 'node:fs'
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
