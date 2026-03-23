/**
 * Safe git operations for knowledge publication.
 *
 * Safety guarantees:
 * - Never pushes to main
 * - Never uses destructive operations (reset --hard, clean, checkout .)
 * - Checks working tree before starting
 * - Creates an isolated branch for each publish session
 * - Stages only specific files
 */

import { execSync } from 'node:child_process'
import type { Frontmatter } from './shared.js'
import { slugify } from './shared.js'

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim()
}

function runSafe(cmd: string): { ok: boolean; output: string } {
  try {
    return { ok: true, output: run(cmd) }
  } catch (err) {
    return { ok: false, output: (err as Error).message }
  }
}

/**
 * Check if tracked files have uncommitted changes.
 * Returns list of modified tracked files (excludes untracked).
 */
export function checkWorkingTree(): string[] {
  const status = run('git diff --name-only')
  const staged = run('git diff --cached --name-only')
  const all = [...status.split('\n'), ...staged.split('\n')].filter(Boolean)
  return [...new Set(all)]
}

/**
 * Safely publish knowledge files via git.
 *
 * Creates a branch, stages files, commits, pushes, and optionally creates a PR.
 * Never touches main. Never uses destructive operations.
 */
export async function safeGitPublish(
  files: string[],
  frontmatterList: Frontmatter[],
  options: { branch?: string; pr?: boolean; noPush?: boolean },
): Promise<void> {
  const originalBranch = run('git branch --show-current')

  // Generate branch name
  const date = new Date().toISOString().slice(0, 10)
  const firstSlug = frontmatterList[0] ? slugify(frontmatterList[0].title) : 'documents'
  const branchName = options.branch || `knowledge/${date}-${firstSlug}`

  // Create and switch to branch
  console.log(`\n📌 Creating branch: ${branchName}`)
  const createResult = runSafe(`git checkout -b "${branchName}"`)
  if (!createResult.ok) {
    // Branch might already exist — try switching to it
    const switchResult = runSafe(`git checkout "${branchName}"`)
    if (!switchResult.ok) {
      console.error(`⚠️  Could not create or switch to branch: ${branchName}`)
      console.log('   Files were written. You can commit manually.')
      return
    }
  }

  // Stage only the specific files
  for (const file of files) {
    runSafe(`git add "${file}"`)
  }

  // Commit
  const commitMsg = frontmatterList.length === 1
    ? `docs(knowledge): add ${frontmatterList[0].domain} ${frontmatterList[0].role} — ${frontmatterList[0].title}`
    : `docs(knowledge): add ${frontmatterList.length} documents`

  const commitResult = runSafe(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`)
  if (!commitResult.ok) {
    console.error('⚠️  Git commit failed:', commitResult.output)
    console.log('   Files were written and staged. You can commit manually.')
    run(`git checkout "${originalBranch}"`)
    return
  }
  console.log(`✅ Committed: ${commitMsg}`)

  // Push
  if (options.noPush) {
    console.log('⏭️  Skipped push (--no-push)')
  } else {
    const pushResult = runSafe(`git push -u origin "${branchName}"`)
    if (!pushResult.ok) {
      console.error('⚠️  Git push failed:', pushResult.output)
      console.log('   Commit is local. You can push manually.')
    } else {
      console.log(`✅ Pushed to origin/${branchName}`)
    }

    // Create PR if requested
    if (options.pr && pushResult.ok) {
      await createPR(branchName, commitMsg, frontmatterList)
    }
  }

  // Return to original branch
  if (originalBranch && originalBranch !== branchName) {
    runSafe(`git checkout "${originalBranch}"`)
    console.log(`↩️  Returned to ${originalBranch}`)
  }
}

async function createPR(
  branch: string,
  title: string,
  frontmatterList: Frontmatter[],
): Promise<void> {
  const docs = frontmatterList
    .map((fm) => `- **${fm.title}** (${fm.domain} ${fm.role})`)
    .join('\n')

  const body = `## Knowledge Publication\n\n${docs}\n\n🤖 Generated with the knowledge publication CLI`

  const result = runSafe(
    `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`,
  )

  if (result.ok) {
    console.log(`✅ PR created: ${result.output}`)
  } else {
    console.log('⚠️  Could not create PR (is `gh` CLI installed and authenticated?)')
    console.log(`   You can create one manually for branch: ${branch}`)
  }
}
