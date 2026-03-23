/**
 * Open WebUI (Dell) sync logic.
 *
 * Uploads knowledge documents to the Open WebUI RAG mirror on the Dell Sovereign Node.
 * Decoupled from the publication flow — run separately when the Dell is on.
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const OPEN_WEBUI_HOST = 'http://100.69.123.40:3000' // Dell on Tailscale
const KNOWLEDGE_BASE_NAME = 'OpenCosmos Knowledge'

export type SyncResult = {
  uploaded: string[]
  failed: string[]
  skipped: string[]
}

/**
 * Check if the Dell is reachable on Tailscale.
 */
export async function checkDellReachability(): Promise<boolean> {
  try {
    const res = await fetch(`${OPEN_WEBUI_HOST}/api/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Sync knowledge files to Open WebUI on the Dell.
 */
export async function syncToDell(filePaths: string[], options?: { dryRun?: boolean }): Promise<SyncResult> {
  const result: SyncResult = { uploaded: [], failed: [], skipped: [] }

  const apiKey = process.env.OPEN_WEBUI_API_KEY
  if (!apiKey) {
    console.log('⚠️  No OPEN_WEBUI_API_KEY set — cannot sync to Dell.')
    result.skipped = filePaths
    return result
  }

  const reachable = await checkDellReachability()
  if (!reachable) {
    console.log('⚠️  Dell not reachable on Tailscale — is it powered on?')
    result.skipped = filePaths
    return result
  }

  if (options?.dryRun) {
    console.log(`\n📋 Would sync ${filePaths.length} files to Open WebUI:`)
    for (const fp of filePaths) console.log(`   ${basename(fp)}`)
    result.skipped = filePaths
    return result
  }

  const headers = { Authorization: `Bearer ${apiKey}` }
  const kbId = await getOrCreateKnowledgeBase(headers)
  if (!kbId) {
    console.log('⚠️  Could not find or create knowledge base on Dell.')
    result.failed = filePaths
    return result
  }

  for (const filePath of filePaths) {
    try {
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
        result.failed.push(filePath)
        continue
      }

      const uploadData = (await uploadRes.json()) as { id: string }

      const addRes = await fetch(`${OPEN_WEBUI_HOST}/api/v1/knowledge/${kbId}/file/add`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: uploadData.id }),
        signal: AbortSignal.timeout(30_000),
      })

      if (addRes.ok) {
        result.uploaded.push(filePath)
      } else {
        result.failed.push(filePath)
      }
    } catch {
      result.failed.push(filePath)
    }
  }

  return result
}

async function getOrCreateKnowledgeBase(headers: Record<string, string>): Promise<string | null> {
  try {
    const listRes = await fetch(`${OPEN_WEBUI_HOST}/api/v1/knowledge/`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!listRes.ok) return null

    const list = (await listRes.json()) as { items: Array<{ id: string; name: string }> }
    const existing = list.items.find((kb) => kb.name === KNOWLEDGE_BASE_NAME)
    if (existing) return existing.id

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
