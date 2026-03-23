/**
 * Frontmatter generation (Claude-only) and fast review.
 */

import { editor, select } from '@inquirer/prompts'
import matter from 'gray-matter'
import {
  ROLES, FORMATS, DOMAINS, AUDIENCES, COMPLEXITIES,
  type Role, type Frontmatter,
  parseJsonResponse,
} from './shared.js'

// ─── Claude Generation ──────────────────────────────────────────────────────

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

export async function generateFrontmatter(
  content: string,
  presets: { role?: string; domain?: string },
): Promise<{ provider: string; suggestions: Partial<Frontmatter> }> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (apiKey) {
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
      if (textBlock && textBlock.type === 'text') {
        const parsed = parseJsonResponse(textBlock.text)
        if (parsed) {
          const suggestions = applyPresets(parsed, presets)
          return { provider: 'Claude API', suggestions }
        }
      }
    } catch {
      // Fall through to manual
    }
  }

  return { provider: 'manual', suggestions: applyPresets({}, presets) }
}

function applyPresets(
  suggestions: Partial<Frontmatter>,
  presets: { role?: string; domain?: string },
): Partial<Frontmatter> {
  if (presets.role && ROLES.includes(presets.role as Role)) suggestions.role = presets.role as Role
  if (presets.domain) suggestions.domain = presets.domain
  return suggestions
}

// ─── Review ─────────────────────────────────────────────────────────────────

export async function reviewFrontmatter(
  suggestions: Partial<Frontmatter>,
  options: { accept?: boolean },
): Promise<Frontmatter> {
  const today = new Date().toISOString().slice(0, 10)

  const defaults: Frontmatter = {
    title: suggestions.title || '',
    role: (suggestions.role as Role) || 'source',
    format: suggestions.format || 'essay',
    domain: suggestions.domain || 'philosophy',
    tags: suggestions.tags || [],
    audience: suggestions.audience || ['general'],
    complexity: suggestions.complexity || 'foundational',
    summary: suggestions.summary || '',
    curated_at: today,
    curator: suggestions.curator || 'shalom',
    source: suggestions.source || 'original',
  }

  // Pretty-print suggestions
  console.log('\n── Frontmatter ─────────────────────────────────────')
  console.log(formatFrontmatter(defaults))
  console.log('────────────────────────────────────────────────────\n')

  if (options.accept) {
    console.log('✅ Auto-accepted (--accept)')
    return defaults
  }

  const action = await select({
    message: 'Review:',
    choices: [
      { name: 'Accept all', value: 'accept' },
      { name: 'Edit in $EDITOR', value: 'edit' },
      { name: 'Cancel', value: 'cancel' },
    ],
  })

  if (action === 'cancel') {
    console.log('Cancelled.')
    process.exit(0)
  }

  if (action === 'accept') {
    return defaults
  }

  // Edit mode: open frontmatter as YAML in editor
  const yaml = formatFrontmatter(defaults)
  const edited = await editor({
    message: 'Edit frontmatter (save and close to continue):',
    default: yaml,
    postfix: '.yaml',
  })

  return parseFrontmatterYaml(edited, defaults)
}

function formatFrontmatter(fm: Frontmatter): string {
  return [
    `title: "${fm.title}"`,
    `role: ${fm.role}`,
    `format: ${fm.format}`,
    `domain: ${fm.domain}`,
    `tags: [${fm.tags.join(', ')}]`,
    `audience: [${fm.audience.join(', ')}]`,
    `complexity: ${fm.complexity}`,
    `summary: >`,
    `  ${fm.summary}`,
    `curated_at: ${fm.curated_at}`,
    `curator: ${fm.curator}`,
    `source: ${fm.source}`,
  ].join('\n')
}

function parseFrontmatterYaml(yaml: string, fallback: Frontmatter): Frontmatter {
  try {
    // Wrap in frontmatter delimiters so gray-matter can parse it
    const wrapped = `---\n${yaml}\n---\n`
    const { data } = matter(wrapped)

    return {
      title: data.title || fallback.title,
      role: ROLES.includes(data.role) ? data.role : fallback.role,
      format: FORMATS.includes(data.format) ? data.format : fallback.format,
      domain: DOMAINS.includes(data.domain) ? data.domain : fallback.domain,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : fallback.tags,
      audience: Array.isArray(data.audience) ? data.audience.map(String) : fallback.audience,
      complexity: COMPLEXITIES.includes(data.complexity) ? data.complexity : fallback.complexity,
      summary: data.summary || fallback.summary,
      curated_at: data.curated_at || fallback.curated_at,
      curator: data.curator || fallback.curator,
      source: data.source || fallback.source,
    }
  } catch {
    console.log('⚠️  Could not parse edited YAML — using previous values.')
    return fallback
  }
}
