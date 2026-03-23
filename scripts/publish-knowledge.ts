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

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { resolve, basename, dirname } from 'node:path'
import { parseArgs } from 'node:util'
import matter from 'gray-matter'
import './knowledge/shared.js' // loads .env
import { ROLES, DOMAINS, KNOWLEDGE_DIR, slugify, type Role, type Frontmatter } from './knowledge/shared.js'
import { generateFrontmatter, reviewFrontmatter } from './knowledge/frontmatter.js'
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

// ─── Help ───────────────────────────────────────────────────────────────────

if (flags.help || positionals.length === 0) {
  console.log(`
OpenCosmos Knowledge Publication CLI

Usage:
  pnpm knowledge:publish <file...> [options]

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
    const { provider, suggestions } = await generateFrontmatter(content, {
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

    // Step 3: Write
    const slug = slugify(frontmatter.title)
    const rolePlural = frontmatter.role + 's'
    const filename = `${frontmatter.domain}-${slug}.md`
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
  }

  // Step 4: Git (batch — one branch, one commit, one push)
  if (flags['dry-run']) {
    console.log('\n🏁 Dry run complete. No files written.')
    return
  }

  if (writtenFiles.length === 0) {
    console.log('\n⚠️  No files were written.')
    return
  }

  await safeGitPublish(writtenFiles, writtenFrontmatter, {
    branch: flags.branch,
    pr: flags.pr,
    noPush: flags['no-push'],
  })

  // Step 5: Clean up source files from knowledge/incoming/
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

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
