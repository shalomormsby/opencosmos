#!/usr/bin/env tsx
/**
 * OpenCosmos Knowledge Publication CLI
 *
 * Automates publishing documents to the knowledge base:
 *   1. Reads a .md file (content only, no frontmatter)
 *   2. Sends content to an LLM to generate frontmatter suggestions
 *   3. Opens interactive review for author confirmation
 *   4. Writes final file with frontmatter to knowledge/{role}s/{domain}-{slug}.md
 *   5. Git add + commit + push
 *   6. Uploads to Open WebUI on Dell (if reachable via Tailscale)
 *
 * Usage:
 *   pnpm knowledge:publish <file> [--role source] [--domain buddhism] [--dry-run] [--no-push] [--no-webui]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, basename, dirname, join } from 'node:path'
import { execSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

// ─── Load .env ──────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.+?)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
import {
  input,
  select,
  checkbox,
  confirm,
  editor,
} from '@inquirer/prompts'

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLES = ['source', 'commentary', 'reference', 'guide', 'collection'] as const
const FORMATS = [
  'treatise', 'poetry', 'aphorisms', 'scripture', 'dialogue', 'essay',
  'manifesto', 'specification', 'manual', 'narrative', 'glossary', 'anthology', 'letter',
] as const
const DOMAINS = [
  'buddhism', 'stoicism', 'sufism', 'taoism', 'vedic', 'indigenous', 'philosophy',
  'ecology', 'science', 'psychology', 'literature', 'art', 'engineering', 'ai',
  'opencosmos', 'cross',
] as const
const AUDIENCES = ['philosopher', 'engineer', 'scientist', 'artist', 'contemplative', 'creator', 'general'] as const
const COMPLEXITIES = ['foundational', 'intermediate', 'advanced'] as const

const KNOWLEDGE_DIR = resolve(__dirname, '..', 'knowledge')
const OPEN_WEBUI_HOST = 'http://100.69.123.40:3000' // Dell on Tailscale — adjust IP as needed

type Role = (typeof ROLES)[number]
type Frontmatter = {
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

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    role: { type: 'string' },
    domain: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'no-push': { type: 'boolean', default: false },
    'no-webui': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

// ─── Help ───────────────────────────────────────────────────────────────────

if (flags.help || positionals.length === 0) {
  console.log(`
OpenCosmos Knowledge Publication CLI

Usage:
  pnpm knowledge:publish <file> [options]

Options:
  --role <role>      Pre-set the document role (${ROLES.join(', ')})
  --domain <domain>  Pre-set the domain (${DOMAINS.join(', ')})
  --dry-run          Generate frontmatter and show result without writing
  --no-push          Commit locally but don't push to remote
  --no-webui         Skip Open WebUI upload
  -h, --help         Show this help message

Examples:
  pnpm knowledge:publish ~/drafts/dhammapada.md --role source --domain buddhism
  pnpm knowledge:publish ~/drafts/essay.md --dry-run
`)
  process.exit(flags.help ? 0 : 1)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const inputPath = resolve(positionals[0])

  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`)
    process.exit(1)
  }

  const raw = readFileSync(inputPath, 'utf-8')

  // Strip any existing frontmatter — we only want the content
  const { content } = matter(raw)
  if (!content.trim()) {
    console.error('Error: File has no content (only frontmatter or empty).')
    process.exit(1)
  }

  console.log(`\n📄 Reading: ${basename(inputPath)}`)
  console.log(`   ${content.split('\n').length} lines, ${content.length} characters\n`)

  // ── Step 1: Generate frontmatter suggestions via LLM ────────────────────

  let suggestions: Partial<Frontmatter> = {}
  const llmProvider = await tryGenerateFrontmatter(content, flags.role, flags.domain)

  if (llmProvider.suggestions) {
    suggestions = llmProvider.suggestions
    console.log(`✅ Frontmatter generated via ${llmProvider.provider}\n`)
  } else {
    console.log('⚠️  No LLM available — entering manual mode.\n')
  }

  // ── Step 2: Interactive review ──────────────────────────────────────────

  const frontmatter = await interactiveReview(suggestions, flags.role, flags.domain)

  // ── Step 3: Compose final document ──────────────────────────────────────

  const slug = slugify(frontmatter.title)
  const rolePlural = frontmatter.role + 's'
  const filename = `${frontmatter.domain}-${slug}.md`
  const destDir = resolve(KNOWLEDGE_DIR, rolePlural)
  const destPath = resolve(destDir, filename)

  const finalDoc = matter.stringify(content, frontmatter)

  console.log(`\n── Final Document ──────────────────────────────────`)
  console.log(`File: knowledge/${rolePlural}/${filename}`)
  console.log(`─────────────────────────────────────────────────────`)
  console.log(finalDoc.slice(0, 500) + (finalDoc.length > 500 ? '\n...' : ''))
  console.log(`─────────────────────────────────────────────────────\n`)

  if (flags['dry-run']) {
    console.log('🏁 Dry run complete. No files written.')
    return
  }

  // ── Step 4: Write file ──────────────────────────────────────────────────

  mkdirSync(destDir, { recursive: true })
  writeFileSync(destPath, finalDoc, 'utf-8')
  console.log(`✅ Written: knowledge/${rolePlural}/${filename}`)

  // ── Step 5: Git add + commit + push ─────────────────────────────────────

  try {
    execSync(`git add "${destPath}"`, { stdio: 'pipe' })
    const commitMsg = `docs(knowledge): add ${frontmatter.domain} ${frontmatter.role} — ${frontmatter.title}`
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: 'pipe' })
    console.log(`✅ Committed: ${commitMsg}`)

    if (!flags['no-push']) {
      execSync('git push', { stdio: 'pipe' })
      console.log('✅ Pushed to remote')
    } else {
      console.log('⏭️  Skipped push (--no-push)')
    }
  } catch (err) {
    console.error('⚠️  Git operation failed:', (err as Error).message)
    console.log('   File was written. You can commit manually.')
  }

  // ── Step 6: Upload to Open WebUI ────────────────────────────────────────

  if (!flags['no-webui']) {
    await uploadToOpenWebUI(destPath, frontmatter)
  } else {
    console.log('⏭️  Skipped Open WebUI upload (--no-webui)')
  }

  console.log('\n🎉 Publication complete!')
}

// ─── LLM Frontmatter Generation ────────────────────────────────────────────

const FRONTMATTER_PROMPT = `You are a knowledge librarian. Given the document content below, generate YAML frontmatter metadata.

Return ONLY a JSON object (no markdown fences, no explanation) with these fields:
- title: string — human-readable document title
- role: one of [${ROLES.join(', ')}] — the document's relationship to knowledge
- format: one of [${FORMATS.join(', ')}] — the literary/structural form
- domain: one of [${DOMAINS.join(', ')}] — primary tradition or discipline
- tags: string[] — 3-7 topical keywords, lowercase, hyphenated
- audience: string[] — from [${AUDIENCES.join(', ')}]
- complexity: one of [${COMPLEXITIES.join(', ')}]
- summary: string — 1-3 sentence abstract
- source: one of [original, public-domain] or a URL/citation

Document content:
`

async function tryGenerateFrontmatter(
  content: string,
  presetRole?: string,
  presetDomain?: string,
): Promise<{ provider: string; suggestions: Partial<Frontmatter> | null }> {
  // Try local Apertus first
  const apertus = await tryApertus(content)
  if (apertus) return { provider: 'Local Apertus (Ollama)', suggestions: applyPresets(apertus, presetRole, presetDomain) }

  // Try Claude API
  const claude = await tryClaude(content)
  if (claude) return { provider: 'Claude API', suggestions: applyPresets(claude, presetRole, presetDomain) }

  // Manual fallback
  return { provider: 'manual', suggestions: applyPresets({}, presetRole, presetDomain) }
}

function applyPresets(
  suggestions: Partial<Frontmatter>,
  presetRole?: string,
  presetDomain?: string,
): Partial<Frontmatter> {
  if (presetRole && ROLES.includes(presetRole as Role)) suggestions.role = presetRole as Role
  if (presetDomain) suggestions.domain = presetDomain
  return suggestions
}

async function tryApertus(content: string): Promise<Partial<Frontmatter> | null> {
  const OLLAMA_URL = 'http://100.69.123.40:11434'
  const truncated = content.slice(0, 4000)

  // Try 70B first (higher quality), fall back to 8B
  // 70B needs up to 5 min for cold start (loading 43GB into VRAM) + generation
  for (const model of ['apertus-70b:latest', 'apertus:latest']) {
    const timeout = model.includes('70b') ? 300_000 : 60_000
    try {
      console.log(`   Trying ${model} (${timeout / 1000}s timeout)...`)
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: FRONTMATTER_PROMPT + truncated,
          stream: false,
          options: { temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(timeout),
      })
      if (!response.ok) {
        console.log(`   ${model}: HTTP ${response.status} ${response.statusText}`)
        continue
      }
      const data = (await response.json()) as { response: string }
      const result = parseJsonResponse(data.response)
      if (result) {
        console.log(`   Using ${model}`)
        return result
      }
      console.log(`   ${model}: could not parse response`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`   ${model}: ${msg.includes('abort') || msg.includes('timeout') ? 'timed out' : msg}`)
      continue
    }
  }
  return null
}

async function tryClaude(content: string): Promise<Partial<Frontmatter> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })
    const truncated = content.slice(0, 6000)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: FRONTMATTER_PROMPT + truncated }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null
    return parseJsonResponse(textBlock.text)
  } catch {
    return null
  }
}

function parseJsonResponse(text: string): Partial<Frontmatter> | null {
  try {
    // Strip markdown fences if present
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()
    // Find the JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─── Interactive Review ─────────────────────────────────────────────────────

async function interactiveReview(
  suggestions: Partial<Frontmatter>,
  presetRole?: string,
  presetDomain?: string,
): Promise<Frontmatter> {
  console.log('── Review Frontmatter ──────────────────────────────')
  console.log('Accept suggestions or edit each field.\n')

  const title = await input({
    message: 'Title:',
    default: suggestions.title || '',
  })

  const role = presetRole && ROLES.includes(presetRole as Role)
    ? (presetRole as Role)
    : await select({
        message: 'Role:',
        choices: ROLES.map((r) => ({ name: r, value: r })),
        default: suggestions.role || 'source',
      })

  const format = await select({
    message: 'Format:',
    choices: FORMATS.map((f) => ({ name: f, value: f })),
    default: suggestions.format || 'essay',
  })

  const domain = presetDomain
    ? presetDomain
    : await select({
        message: 'Domain:',
        choices: DOMAINS.map((d) => ({ name: d, value: d })),
        default: suggestions.domain || 'philosophy',
      })

  const tagsStr = await input({
    message: 'Tags (comma-separated):',
    default: (suggestions.tags || []).join(', '),
  })
  const tags = tagsStr
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const audience = await checkbox({
    message: 'Audience:',
    choices: AUDIENCES.map((a) => ({
      name: a,
      value: a,
      checked: (suggestions.audience || ['general']).includes(a),
    })),
  })

  const complexity = await select({
    message: 'Complexity:',
    choices: COMPLEXITIES.map((c) => ({ name: c, value: c })),
    default: suggestions.complexity || 'foundational',
  })

  const summary = await input({
    message: 'Summary:',
    default: suggestions.summary || '',
  })

  const source = await input({
    message: 'Source (original, public-domain, URL, or citation):',
    default: suggestions.source || 'original',
  })

  const curator = await input({
    message: 'Curator:',
    default: 'shalom',
  })

  const today = new Date().toISOString().slice(0, 10)

  return {
    title,
    role: role as Role,
    format,
    domain,
    tags,
    audience,
    complexity,
    summary,
    curated_at: today,
    curator,
    source,
  }
}

// ─── Open WebUI Upload ─────────────────────────────────────────────────────

const KNOWLEDGE_BASE_NAME = 'OpenCosmos Knowledge'

async function uploadToOpenWebUI(filePath: string, frontmatter: Frontmatter) {
  try {
    const apiKey = process.env.OPEN_WEBUI_API_KEY
    if (!apiKey) {
      console.log('⏭️  Skipped Open WebUI upload (no OPEN_WEBUI_API_KEY)')
      return
    }

    const headers = { Authorization: `Bearer ${apiKey}` }

    // Check reachability
    const health = await fetch(`${OPEN_WEBUI_HOST}/api/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (!health.ok) throw new Error('Not reachable')

    // Step 1: Upload the file
    const fileContent = readFileSync(filePath)
    const formData = new FormData()
    const blob = new Blob([fileContent], { type: 'text/markdown' })
    formData.append('file', blob, basename(filePath))

    const uploadRes = await fetch(`${OPEN_WEBUI_HOST}/api/v1/files/`, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(15_000),
    })

    if (!uploadRes.ok) {
      console.log(`⚠️  Open WebUI file upload failed: ${uploadRes.status} ${uploadRes.statusText}`)
      return
    }

    const uploadData = (await uploadRes.json()) as { id: string }
    const fileId = uploadData.id
    console.log(`✅ Uploaded file to Open WebUI`)

    // Step 2: Find or create the knowledge base
    const kbId = await getOrCreateKnowledgeBase(headers)
    if (!kbId) {
      console.log('⚠️  Could not find or create knowledge base')
      return
    }

    // Step 3: Add the file to the knowledge base
    const addRes = await fetch(`${OPEN_WEBUI_HOST}/api/v1/knowledge/${kbId}/file/add`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
      signal: AbortSignal.timeout(30_000),
    })

    if (addRes.ok) {
      console.log(`✅ Added to "${KNOWLEDGE_BASE_NAME}" knowledge base`)
    } else {
      console.log(`⚠️  Failed to add to knowledge base: ${addRes.status} ${addRes.statusText}`)
    }
  } catch {
    console.log('⏭️  Open WebUI not reachable on Tailscale — skipped')
  }
}

async function getOrCreateKnowledgeBase(headers: Record<string, string>): Promise<string | null> {
  try {
    // List existing knowledge bases
    const listRes = await fetch(`${OPEN_WEBUI_HOST}/api/v1/knowledge/`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!listRes.ok) return null

    const list = (await listRes.json()) as { items: Array<{ id: string; name: string }> }
    const existing = list.items.find((kb) => kb.name === KNOWLEDGE_BASE_NAME)
    if (existing) return existing.id

    // Create it
    const createRes = await fetch(`${OPEN_WEBUI_HOST}/api/v1/knowledge/create`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: KNOWLEDGE_BASE_NAME,
        description: 'Curated corpus of human wisdom — organized for retrieval by machines and navigation by people.',
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!createRes.ok) return null

    const created = (await createRes.json()) as { id: string }
    console.log(`   Created "${KNOWLEDGE_BASE_NAME}" knowledge base`)
    return created.id
  } catch {
    return null
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
