#!/usr/bin/env tsx
/**
 * Cosmo Voice Test
 *
 * Sends a question to Claude with COSMO_SYSTEM_PROMPT.md as the system prompt.
 * This is a throwaway evaluation script — its only job is to let you feel the voice.
 *
 * Usage:
 *   pnpm tsx scripts/test-cosmo-voice.ts "What is the meaning of life?"
 *   pnpm tsx scripts/test-cosmo-voice.ts "I'm facing injustice at work. What do I do?"
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Load .env
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.+?)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

// Read system prompt
const systemPromptPath = join(root, 'packages/ai/COSMO_SYSTEM_PROMPT.md')
const systemPrompt = readFileSync(systemPromptPath, 'utf-8')

// User message from CLI args
const userMessage = process.argv.slice(2).join(' ')
if (!userMessage) {
  console.error('Usage: pnpm tsx scripts/test-cosmo-voice.ts "<your question>"')
  process.exit(1)
}

const client = new Anthropic()

async function main() {
  console.log(`\n— Asking Cosmo: "${userMessage}"\n`)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  console.log(text)
  console.log(`\n— (${response.usage.input_tokens} in / ${response.usage.output_tokens} out)\n`)
}

main()

