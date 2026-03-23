#!/usr/bin/env tsx
/**
 * OpenCosmos Knowledge Publication CLI
 *
 * Streamlined workflow:
 *   1. Read .md file(s) — content only, no frontmatter needed
 *   2. Generate frontmatter via Claude API
 *   3. Fast review: accept, edit in $EDITOR, or cancel
 *   4. Write to knowledge/{role}s/{domain}-{slug}.md
 *   5. Safe git: create branch → commit → push → optional PR
 *
 * Usage:
 *   pnpm knowledge:publish <file...> [--role source] [--domain buddhism] [--accept] [--pr] [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, appendFileSync, readdirSync } from 'node:fs'
import { resolve, basename, dirname } from 'node:path'
import { parseArgs } from 'node:util'
import matter from 'gray-matter'
import './knowledge/shared.js' // loads .env
import { ROLES, DOMAINS, KNOWLEDGE_DIR, slugify, type Role, type Frontmatter } from './knowledge/shared.js'
import { generateFrontmatter, reviewFrontmatter, suggestRelatedDocs, type GenerationResult } from './knowledge/frontmatter.js'
import { checkWorkingTree, safeGitPublish } from './knowledge/git.js'

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    role: { type: 'string' },
    domain: { type: 'string' },
    accept: { type: 'boolean', default: false },
    branch: { type: 'string' },
    pr: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'no-push': { type: 'boolean', default: false },
    'no-clean': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

// ─── Incoming auto-discovery ─────────────────────────────────────────────────

const incomingDir = resolve(KNOWLEDGE_DIR, 'incoming')

if (!flags.help && positionals.length === 0) {
  // No files specified — auto-discover from knowledge/incoming/
  if (existsSync(incomingDir)) {
    const incoming = readdirSync(incomingDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => resolve(incomingDir, f))

    if (incoming.length > 0) {
      positionals.push(...incoming)
      console.log(`\n📥 Auto-importing ${incoming.length} file${incoming.length > 1 ? 's' : ''} from knowledge/incoming/`)
      for (const f of incoming) console.log(`   ${basename(f)}`)
    }
  }
}

// ─── Help ───────────────────────────────────────────────────────────────────

if (flags.help || positionals.length === 0) {
  console.log(`
OpenCosmos Knowledge Publication CLI

Usage:
  pnpm knowledge:publish [file...] [options]

  If no files are specified, auto-imports all .md files from knowledge/incoming/.

Options:
  --role <role>        Pre-set the document role (${ROLES.join(', ')})
  --domain <domain>    Pre-set the domain (${DOMAINS.join(', ')})
  --accept             Accept Claude's frontmatter suggestions without review
  --branch <name>      Custom git branch name (default: knowledge/{date}-{slug})
  --pr                 Create a GitHub PR after pushing
  --dry-run            Preview without writing, committing, or pushing
  --no-push            Commit locally but don't push to remote
  --no-clean           Keep source files in knowledge/incoming/ after publish
  -h, --help           Show this help message

Examples:
  pnpm knowledge:publish --accept                 # auto-import from knowledge/incoming/
  pnpm knowledge:publish ~/drafts/dhammapada.md --role source --domain buddhism
  pnpm knowledge:publish ~/drafts/essay.md --dry-run
  pnpm knowledge:publish ~/drafts/*.md --accept --pr
`)
  process.exit(flags.help ? 0 : 1)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Check for uncommitted tracked changes before starting
  if (!flags['dry-run']) {
    const dirty = checkWorkingTree()
    if (dirty.length > 0) {
      console.log('\n⚠️  You have uncommitted changes to tracked files:')
      for (const f of dirty) console.log(`   ${f}`)
      console.log('\n   Please commit or stash them first. This prevents accidental data loss.')
      console.log('   (Use --dry-run to preview without writing.)\n')
      process.exit(1)
    }
  }

  const writtenFiles: string[] = []
  const writtenFrontmatter: Frontmatter[] = []
  const sourceFiles: string[] = [] // track originals for cleanup
  const curationEntries: { frontmatter: Frontmatter; destPath: string; curationMeta?: GenerationResult['curationMeta'] }[] = []

  for (const inputArg of positionals) {
    const inputPath = resolve(inputArg)

    if (!existsSync(inputPath)) {
      console.error(`\n⚠️  File not found: ${inputPath} — skipping.`)
      continue
    }

    const raw = readFileSync(inputPath, 'utf-8')
    const { content } = matter(raw)

    if (!content.trim()) {
      console.error(`\n⚠️  ${basename(inputPath)} has no content — skipping.`)
      continue
    }

    console.log(`\n📄 ${basename(inputPath)} — ${content.split('\n').length} lines, ${content.length} chars`)

    // Step 1: Generate frontmatter
    const { provider, suggestions, curationMeta } = await generateFrontmatter(content, {
      role: flags.role,
      domain: flags.domain,
    })

    if (provider !== 'manual') {
      console.log(`   Frontmatter generated via ${provider}`)
    } else {
      console.log('   ⚠️  No LLM available — entering manual mode.')
    }

    // Step 2: Review
    const frontmatter = await reviewFrontmatter(suggestions, { accept: flags.accept })

    // Step 3: Cross-reference suggestions
    const slug = slugify(frontmatter.title)
    const rolePlural = frontmatter.role + 's'
    const filename = `${frontmatter.domain}-${slug}.md`
    const newRelativePath = `${rolePlural}/${filename}`

    const refs = suggestRelatedDocs(frontmatter, newRelativePath)
    if (refs.forNew.length > 0) {
      frontmatter.related_docs = refs.forNew
      console.log(`\n   🔗 Related documents (${refs.forNew.length}):`)
      for (const ref of refs.forNew) console.log(`      ${ref}`)
    }
    if (refs.bidirectional.length > 0) {
      console.log(`\n   ↔️  Bidirectional — these docs should also link back:`)
      for (const ref of refs.bidirectional) console.log(`      ${ref.title} (${ref.path})`)
    }
    if (refs.isIsland) {
      console.log(`\n   ⚠️  Island: no existing documents share tags, domain, or audience.`)
    }

    // Step 4: Write
    const destDir = resolve(KNOWLEDGE_DIR, rolePlural)
    const destPath = resolve(destDir, filename)
    const finalDoc = matter.stringify(content, frontmatter)

    console.log(`\n   → knowledge/${rolePlural}/${filename}`)

    if (flags['dry-run']) {
      console.log('\n── Preview ─────────────────────────────────────────')
      console.log(finalDoc.slice(0, 500) + (finalDoc.length > 500 ? '\n...' : ''))
      console.log('────────────────────────────────────────────────────')
      continue
    }

    mkdirSync(destDir, { recursive: true })
    writeFileSync(destPath, finalDoc, 'utf-8')
    console.log(`   ✅ Written`)

    writtenFiles.push(destPath)
    writtenFrontmatter.push(frontmatter)
    sourceFiles.push(inputPath)
    curationEntries.push({ frontmatter, destPath: newRelativePath, curationMeta })
  }

  // Step 5: Curation log + Collection auto-linking
  if (flags['dry-run']) {
    console.log('\n🏁 Dry run complete. No files written.')
    return
  }

  if (writtenFiles.length === 0) {
    console.log('\n⚠️  No files were written.')
    return
  }

  // Append to curation log
  const logPath = resolve(KNOWLEDGE_DIR, 'CURATION_LOG.md')
  const logEntry = buildCurationLogEntry(curationEntries)
  if (logEntry) {
    if (!existsSync(logPath)) {
      writeFileSync(logPath, '# Curation Log\n\nA living record of what was added to the knowledge corpus, when, and why it matters.\n\n---\n\n', 'utf-8')
    }
    appendFileSync(logPath, logEntry, 'utf-8')
    writtenFiles.push(logPath)
    console.log('\n📝 Curation log updated')
  }

  // Auto-link foundation collection placeholders
  const collectionUpdates = updateCollectionPlaceholders(writtenFrontmatter)
  for (const updated of collectionUpdates) {
    writtenFiles.push(updated)
  }

  // Step 6: Git (batch — one branch, one commit, one push)
  await safeGitPublish(writtenFiles, writtenFrontmatter, {
    branch: flags.branch,
    pr: flags.pr,
    noPush: flags['no-push'],
  })

  // Step 7: Clean up source files from knowledge/incoming/
  if (!flags['no-clean']) {
    const incomingDir = resolve(KNOWLEDGE_DIR, 'incoming')
    const cleaned: string[] = []
    for (const src of sourceFiles) {
      if (dirname(src).startsWith(incomingDir) && existsSync(src)) {
        unlinkSync(src)
        cleaned.push(basename(src))
      }
    }
    if (cleaned.length > 0) {
      console.log(`\n🧹 Cleaned up ${cleaned.length} source file${cleaned.length > 1 ? 's' : ''} from incoming/`)
    }
  }

  console.log('\n🎉 Publication complete!')
}

// ─── Curation Log ────────────────────────────────────────────────────────────

function buildCurationLogEntry(
  entries: { frontmatter: Frontmatter; destPath: string; curationMeta?: GenerationResult['curationMeta'] }[],
): string {
  if (entries.length === 0) return ''

  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = [`## ${date}\n`]

  for (const { frontmatter: fm, destPath, curationMeta } of entries) {
    lines.push(`### ${fm.title}`)
    lines.push(`- **Role:** ${fm.role} | **Domain:** ${fm.domain} | **Format:** ${fm.format}`)
    lines.push(`- **Path:** \`knowledge/${destPath}\``)
    lines.push(`- **Curator:** ${fm.curator} | **Tags:** ${fm.tags.join(', ')}`)
    if (fm.author) lines.push(`- **Author:** ${fm.author}`)
    if (fm.origin_date) lines.push(`- **Origin:** ${fm.origin_date}${fm.era ? ` (${fm.era})` : ''}`)
    if (fm.tradition) lines.push(`- **Tradition:** ${fm.tradition}`)
    if (fm.related_docs?.length) lines.push(`- **Related:** ${fm.related_docs.join(', ')}`)
    if (curationMeta?.gaps_served) lines.push(`- **Gaps served:** ${curationMeta.gaps_served}`)
    if (curationMeta?.graph_impact) lines.push(`- **Graph impact:** ${curationMeta.graph_impact}`)
    lines.push('')
  }

  lines.push('---\n\n')
  return lines.join('\n')
}

// ─── Foundation Collection Auto-Linking ─────────────────────────────────────

function updateCollectionPlaceholders(frontmatterList: Frontmatter[]): string[] {
  const collectionsDir = resolve(KNOWLEDGE_DIR, 'collections')
  if (!existsSync(collectionsDir)) return []

  const updatedFiles: string[] = []

  // Read all collection files
  const collectionFiles = readdirSync(collectionsDir).filter((f) => f.endsWith('.md'))

  for (const collFile of collectionFiles) {
    const collPath = resolve(collectionsDir, collFile)
    let content = readFileSync(collPath, 'utf-8')
    let modified = false

    for (const fm of frontmatterList) {
      // Look for unchecked placeholders that match the document title
      // e.g., "- [ ] The Dhammapada" or "- [ ] The Dhammapada (Buddhism — suffering...)"
      const titleEscaped = fm.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(
        `^(\\s*)-\\s*\\[\\s*\\]\\s*${titleEscaped}(\\s*\\(.*?\\))?\\s*$`,
        'gm',
      )

      const rolePlural = fm.role + 's'
      const slug = slugify(fm.title)
      const filename = `${fm.domain}-${slug}.md`
      const linkPath = `../${rolePlural}/${filename}`

      const replacement = `$1- [x] [${fm.title}](${linkPath})$2`
      const newContent = content.replace(pattern, replacement)

      if (newContent !== content) {
        content = newContent
        modified = true
        console.log(`\n   📋 Updated collection placeholder: ${collFile} → ${fm.title}`)
      }
    }

    if (modified) {
      writeFileSync(collPath, content, 'utf-8')
      updatedFiles.push(collPath)
    }
  }

  return updatedFiles
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
