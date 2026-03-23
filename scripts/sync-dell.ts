#!/usr/bin/env tsx
/**
 * OpenCosmos Dell Sync CLI
 *
 * Syncs knowledge documents to Open WebUI on the Dell Sovereign Node.
 * Run this when the Dell is on and you want to catch up the local mirror.
 *
 * Usage:
 *   pnpm knowledge:sync-dell [--dry-run]
 */

import { readdirSync, statSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { parseArgs } from 'node:util'
import './knowledge/shared.js' // loads .env
import { KNOWLEDGE_DIR } from './knowledge/shared.js'
import { syncToDell } from './knowledge/dell-sync.js'

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

if (flags.help) {
  console.log(`
OpenCosmos Dell Sync CLI

Syncs all knowledge documents to Open WebUI on the Dell Sovereign Node.

Usage:
  pnpm knowledge:sync-dell [options]

Options:
  --dry-run    Show what would be synced without uploading
  -h, --help   Show this help message
`)
  process.exit(0)
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = []
  const subdirs = ['sources', 'commentary', 'reference', 'guides', 'collections']

  for (const sub of subdirs) {
    const subPath = join(dir, sub)
    try {
      for (const entry of readdirSync(subPath)) {
        const full = resolve(subPath, entry)
        if (entry.endsWith('.md') && statSync(full).isFile()) {
          files.push(full)
        }
      }
    } catch {
      // Directory doesn't exist yet — that's fine
    }
  }
  return files
}

async function main() {
  const files = collectMarkdownFiles(KNOWLEDGE_DIR)

  if (files.length === 0) {
    console.log('No knowledge documents found to sync.')
    process.exit(0)
  }

  console.log(`\n📚 Found ${files.length} knowledge documents`)

  const result = await syncToDell(files, { dryRun: flags['dry-run'] })

  if (!flags['dry-run']) {
    console.log('\n── Sync Summary ────────────────────────────────────')
    if (result.uploaded.length > 0) {
      console.log(`✅ Uploaded: ${result.uploaded.length}`)
      for (const f of result.uploaded) console.log(`   ${basename(f)}`)
    }
    if (result.failed.length > 0) {
      console.log(`❌ Failed: ${result.failed.length}`)
      for (const f of result.failed) console.log(`   ${basename(f)}`)
    }
    if (result.skipped.length > 0) {
      console.log(`⏭️  Skipped: ${result.skipped.length}`)
    }
    console.log('────────────────────────────────────────────────────')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
