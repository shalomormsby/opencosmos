#!/usr/bin/env tsx
/**
 * OpenCosmos Knowledge Corpus Health Report
 *
 * Provides an overhead map of the knowledge corpus:
 * - Document count, domain coverage, graph density
 * - Domain and role coverage with visual indicators
 * - Foundation collection progress
 * - Cross-reference integrity
 * - Island detection (documents with zero connections)
 * - Import priority suggestions
 *
 * Usage:
 *   pnpm knowledge:health
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import matter from 'gray-matter'
import './knowledge/shared.js' // loads .env
import { DOMAINS, ROLES, KNOWLEDGE_DIR, scanCorpus, type CorpusEntry } from './knowledge/shared.js'

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const corpus = scanCorpus()

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║        OpenCosmos Knowledge — Health Report         ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  printOverview(corpus)
  printDomainCoverage(corpus)
  printRoleCoverage(corpus)
  printFoundationProgress()
  printCrossRefIntegrity(corpus)
  printIslands(corpus)
  printImportPriority(corpus)

  console.log('')
}

// ─── Overview ───────────────────────────────────────────────────────────────

function printOverview(corpus: CorpusEntry[]) {
  const domains = new Set(corpus.map((e) => e.frontmatter.domain).filter(Boolean))
  const totalRefs = corpus.reduce((sum, e) => {
    const refs = e.frontmatter.related_docs
    return sum + (Array.isArray(refs) ? refs.length : 0)
  }, 0)
  const maxPossible = corpus.length * (corpus.length - 1)
  const density = maxPossible > 0 ? ((totalRefs / maxPossible) * 100).toFixed(1) : '0'

  console.log('── Overview ────────────────────────────────────────────')
  console.log(`   Documents:       ${corpus.length}`)
  console.log(`   Domains active:  ${domains.size} / ${DOMAINS.length}`)
  console.log(`   Cross-refs:      ${totalRefs}`)
  console.log(`   Graph density:   ${density}%`)
  console.log('')
}

// ─── Domain Coverage ────────────────────────────────────────────────────────

function printDomainCoverage(corpus: CorpusEntry[]) {
  const counts = new Map<string, number>()
  for (const d of DOMAINS) counts.set(d, 0)
  for (const entry of corpus) {
    const d = entry.frontmatter.domain as string
    if (d) counts.set(d, (counts.get(d) || 0) + 1)
  }

  const max = Math.max(...counts.values(), 1)

  console.log('── Domain Coverage ─────────────────────────────────────')
  for (const [domain, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    const bar = count > 0 ? '█'.repeat(Math.ceil((count / max) * 20)) : ''
    const empty = count === 0 ? ' (empty)' : ''
    console.log(`   ${domain.padEnd(14)} ${bar} ${count}${empty}`)
  }
  console.log('')
}

// ─── Role Coverage ──────────────────────────────────────────────────────────

function printRoleCoverage(corpus: CorpusEntry[]) {
  const counts = new Map<string, number>()
  for (const r of ROLES) counts.set(r, 0)
  for (const entry of corpus) {
    const r = entry.frontmatter.role as string
    if (r) counts.set(r, (counts.get(r) || 0) + 1)
  }

  console.log('── Role Coverage ───────────────────────────────────────')
  for (const [role, count] of counts.entries()) {
    const indicator = count === 0 ? '⚠️ ' : '   '
    console.log(`${indicator}${role.padEnd(14)} ${count}`)
  }
  console.log('')
}

// ─── Foundation Collection Progress ─────────────────────────────────────────

function printFoundationProgress() {
  const collectionsDir = resolve(KNOWLEDGE_DIR, 'collections')
  if (!existsSync(collectionsDir)) {
    console.log('── Foundation Progress ─────────────────────────────────')
    console.log('   No collections directory found.')
    console.log('')
    return
  }

  const collectionFiles = readdirSync(collectionsDir).filter((f) => f.endsWith('.md'))

  console.log('── Foundation Collection Progress ──────────────────────')

  for (const file of collectionFiles) {
    const content = readFileSync(resolve(collectionsDir, file), 'utf-8')
    const checked = (content.match(/- \[x\]/g) || []).length
    const unchecked = (content.match(/- \[ \]/g) || []).length
    const total = checked + unchecked

    if (total === 0) continue

    const pct = Math.round((checked / total) * 100)
    const bar = '█'.repeat(Math.ceil(pct / 5)) + '░'.repeat(20 - Math.ceil(pct / 5))

    const name = file.replace('.md', '').replace(/-/g, ' ')
    console.log(`   ${name}`)
    console.log(`   ${bar} ${checked}/${total} (${pct}%)`)
  }
  console.log('')
}

// ─── Cross-Reference Integrity ──────────────────────────────────────────────

function printCrossRefIntegrity(corpus: CorpusEntry[]) {
  const allPaths = new Set(corpus.map((e) => e.relativePath))
  // Also accept bare filenames (some related_docs may omit the subdir)
  const allFilenames = new Set(corpus.map((e) => e.relativePath.split('/').pop()!))

  const broken: { from: string; ref: string }[] = []

  for (const entry of corpus) {
    const refs = entry.frontmatter.related_docs
    if (!Array.isArray(refs)) continue

    for (const ref of refs) {
      // Accept if it matches a full path or a bare filename
      if (!allPaths.has(ref) && !allFilenames.has(ref)) {
        broken.push({ from: entry.relativePath, ref })
      }
    }
  }

  console.log('── Cross-Reference Integrity ───────────────────────────')
  if (broken.length === 0) {
    console.log('   ✅ All cross-references resolve correctly.')
  } else {
    console.log(`   ⚠️  ${broken.length} broken reference${broken.length > 1 ? 's' : ''}:`)
    for (const { from, ref } of broken) {
      console.log(`      ${from} → ${ref} (not found)`)
    }
  }
  console.log('')
}

// ─── Islands ────────────────────────────────────────────────────────────────

function printIslands(corpus: CorpusEntry[]) {
  // Build a set of documents referenced by at least one other document
  const referenced = new Set<string>()
  for (const entry of corpus) {
    const refs = entry.frontmatter.related_docs
    if (!Array.isArray(refs)) continue
    for (const ref of refs) referenced.add(ref)
  }

  // A document is an island if: no other doc references it AND it references nothing
  const islands = corpus.filter((entry) => {
    const filename = entry.relativePath.split('/').pop()!
    const hasIncoming = referenced.has(entry.relativePath) || referenced.has(filename)
    const hasOutgoing = Array.isArray(entry.frontmatter.related_docs) && entry.frontmatter.related_docs.length > 0
    return !hasIncoming && !hasOutgoing
  })

  console.log('── Islands (Zero Connections) ──────────────────────────')
  if (islands.length === 0) {
    console.log('   ✅ No islands — every document is connected.')
  } else {
    console.log(`   ⚠️  ${islands.length} island${islands.length > 1 ? 's' : ''}:`)
    for (const island of islands) {
      const title = island.frontmatter.title || island.relativePath
      console.log(`      ${title} (${island.relativePath})`)
    }
  }
  console.log('')
}

// ─── Import Priority ───────────────────────────────────────────────────────

function printImportPriority(corpus: CorpusEntry[]) {
  // Scan collection placeholders for unchecked items
  const collectionsDir = resolve(KNOWLEDGE_DIR, 'collections')
  if (!existsSync(collectionsDir)) return

  const placeholders: { title: string; collection: string; domain?: string; score: number }[] = []
  const collectionFiles = readdirSync(collectionsDir).filter((f) => f.endsWith('.md'))
  const existingDomains = new Set(corpus.map((e) => e.frontmatter.domain).filter(Boolean))
  const existingTags = new Map<string, number>()
  for (const entry of corpus) {
    for (const tag of entry.frontmatter.tags || []) {
      existingTags.set(tag, (existingTags.get(tag) || 0) + 1)
    }
  }

  for (const file of collectionFiles) {
    const content = readFileSync(resolve(collectionsDir, file), 'utf-8')
    const collName = file.replace('.md', '').replace(/-/g, ' ')

    // Find unchecked placeholders
    const uncheckedPattern = /- \[ \] (.+?)(?:\n|$)/g
    let match
    while ((match = uncheckedPattern.exec(content)) !== null) {
      const raw = match[1].trim()
      // Skip markdown links (these are cross-references, not importable texts)
      if (raw.startsWith('[') && raw.includes('](')) continue
      // Extract title — strip parenthetical descriptions and markdown formatting
      const title = raw.replace(/\s*\(.*?\)\s*$/, '').replace(/\*([^*]+)\*/g, '$1').trim()

      let score = 1 // base: it's in a foundation collection

      // Count how many collections reference this title
      let collectionMentions = 0
      for (const cf of collectionFiles) {
        const cc = readFileSync(resolve(collectionsDir, cf), 'utf-8')
        if (cc.includes(title)) collectionMentions++
      }
      score += collectionMentions

      // Bonus: would create a new domain
      const domainHint = raw.match(/\(([^)]+)\)/)?.[1]?.split(/[—–,]/)[0]?.trim().toLowerCase()
      if (domainHint && !existingDomains.has(domainHint)) score += 2

      placeholders.push({ title, collection: collName, score })
    }
  }

  // Deduplicate by title, sum scores
  const deduped = new Map<string, { title: string; collections: string[]; score: number }>()
  for (const p of placeholders) {
    const existing = deduped.get(p.title)
    if (existing) {
      existing.score += p.score
      if (!existing.collections.includes(p.collection)) existing.collections.push(p.collection)
    } else {
      deduped.set(p.title, { title: p.title, collections: [p.collection], score: p.score })
    }
  }

  const sorted = [...deduped.values()].sort((a, b) => b.score - a.score).slice(0, 7)

  console.log('── Import Priority (Top Texts to Add Next) ────────────')
  if (sorted.length === 0) {
    console.log('   ✅ All collection placeholders have been filled!')
  } else {
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      console.log(`   ${i + 1}. ${item.title}`)
      console.log(`      Referenced in: ${item.collections.join(', ')} | Score: ${item.score}`)
    }
  }
}

main()
