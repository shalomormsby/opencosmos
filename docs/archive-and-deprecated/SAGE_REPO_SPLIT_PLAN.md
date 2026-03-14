# Sage Design Engine: Repository Split Plan

**Date:** 2026-02-16
**Status:** DRAFT
**Objective:** Extract the Sage Design Engine (SDE) into a dedicated, professional repository suitable for Moloco's `speedboat-sandbox` GitHub org, while maintaining seamless service for existing personal applications.

---

## 1. Executive Summary

We are separating the **Infrastructure** (Sage Design Engine) from the **Implementation** (Personal Apps).

The goal is to create a pristine, professional repository for the design system that Moloco engineers can clone, review, and contribute to without being exposed to unrelated personal project code. This separation enforces a strict producer/consumer relationship, mimicking a real-world professional environment.

**What moves to the new repo:** All `packages/*`, the Studio app (`apps/web`), release automation, and documentation relevant to the design system.

**What stays in `ecosystem`:** All personal apps (`portfolio`, `creative-powerup`, `sage-stocks`, `sageos`, `mobile`), which become NPM consumers.

## 2. Target Architecture

### Repository A: `sage-design-engine` (New — pushed to Moloco `speedboat-sandbox`)
*   **Role:** The "Producer"
*   **Contents:**
    *   `packages/*` (ui, tokens, hooks, charts, core, mcp, utils, config)
    *   `apps/web` (The Interactive Studio/Documentation)
    *   `.changeset/`, `.github/workflows/` (Release automation)
    *   `scripts/append-changelog-date.js` (Used by changeset version script)
    *   `turbo.json`, root `package.json`, `pnpm-workspace.yaml`
    *   `DESIGN-PHILOSOPHY.md`, `README.md` (rewritten for SDE audience)
    *   `docs/` (only SDE-relevant docs — enterprise guide, MCP setup, etc.)
*   **Output:** Publishes immutable versions of `@thesage/*` packages to NPM.

### Repository B: `ecosystem` (Existing, Reduced — stays on personal GitHub)
*   **Role:** The "Consumer"
*   **Contents:**
    *   `apps/portfolio`
    *   `apps/creative-powerup`
    *   `apps/sage-stocks`
    *   `apps/sageos`
    *   `apps/mobile`
*   **Dependency:** Consumes `@thesage/*` packages via NPM versions (e.g., `^1.1.1`) instead of workspace links (`workspace:*`).

---

## 3. Risk Assessment

| Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Breaking `workspace:*` Protocol** | High | Certain | Publish stable versions of all packages *before* severing the link, then update `package.json` in the consumer repo to use those specific versions. |
| **Local Development Friction** | Medium | High | Developing SDE features while testing them in `portfolio` becomes harder (no more instant updates). Mitigate using `pnpm link` or `yalc` for local testing before publishing. |
| **Version Drift** | Medium | Medium | If `sage-design-engine` ships v2.0 but `ecosystem` is stuck on v1.0, features might diverge. Regular dependency updates (via Renovate or manual PRs) will be required in `ecosystem`. |
| **Duplicate Configs** | Low | Low | Tooling configs (eslint, tsconfig) might drift. `@thesage/config` is already published as a package that both repos can consume. |
| **Git History Leaking Personal Context** | Medium | High | A naive `git clone` carries all personal app history into the professional repo. Use `git filter-repo` or start fresh (see Phase 2). |
| **Environment Variables / Secrets** | High | Certain | `apps/web` likely needs env vars (e.g., for deployment). Inventory these before the split. The new GitHub repo needs its own secrets configured. |

### Confidence Level: HIGH (90%)
The architecture is standard practice for design systems. The risk lies entirely in the **transition mechanics** — ensuring the "Consumer" apps don't lose access to necessary shared code during the split. The original monorepo remains git-tracked and fully functional until the split is verified.

---

## 4. Pre-Flight Checklist

Before executing any phase, confirm the following:

- [ ] All `@thesage/*` packages build cleanly: `pnpm build`
- [ ] All tests pass: `pnpm --filter @thesage/ui test`
- [ ] `npm view @thesage/ui version` — know the current published version
- [ ] Inventory environment variables needed by `apps/web` (check `.env*`, `next.config.*`, Vercel dashboard)
- [ ] Identify all `workspace:*` references across the monorepo: `grep -r "workspace:\*" apps/*/package.json packages/*/package.json`
- [ ] Note the current Vercel project connections for `apps/web` (will need reconfiguring)
- [ ] Clean up the stale `"design-system"` entry in `pnpm-workspace.yaml` (legacy — no such directory exists)

---

## 5. Execution Plan (Step-by-Step)

### Phase 1: Preparation & Publishing
**Goal:** Ensure all current packages are published and accessible on NPM so that "Consumer" apps can survive without local source code.

1.  **Audit Exports:** Verify all packages (`ui`, `tokens`, `hooks`, `charts`, `core`, `mcp`, `utils`, `config`) export everything needed by the consumer apps.
    *   Quick check: In each app, search for all `@thesage/*` imports. Confirm each resolves to a published package.
2.  **Versioning:** Run a comprehensive `changeset` to version all packages.
3.  **Publish:** Execute a release to NPM. Confirm: `npm view @thesage/ui version` matches the local state.
4.  **Pin Versions:** Record the exact published versions of every `@thesage/*` package. You'll need these in Phase 3.

**Success Criteria:**
- [ ] Every `@thesage/*` package is published to NPM with the latest source
- [ ] `npm install @thesage/ui@<version>` works in a clean directory

---

### Phase 2: The "Clone & Prune" (Creating new Repo)
**Goal:** Create the clean `sage-design-engine` repo with no personal project artifacts.

**Git History Decision:**

| Approach | Pros | Cons |
| :--- | :--- | :--- |
| **Fresh start (recommended)** | Pristine history, no personal commits visible, smallest repo | Lose git blame for packages |
| **`git filter-repo`** | Preserve relevant history | Complex, may still leak personal context in commit messages |

*Recommendation:* **Fresh start.** Copy files (not `.git/`), initialize a new repo. The existing `ecosystem` repo preserves the full history if you ever need it.

**Steps:**

1.  **Copy (not clone):** Copy the relevant files into a new `sage-design-engine` directory. Do NOT copy `.git/`.
2.  **Prune personal apps:** Delete:
    *   `apps/portfolio`
    *   `apps/creative-powerup`
    *   `apps/sage-stocks`
    *   `apps/sageos`
    *   `apps/mobile`
3.  **Sanitize root files:**
    *   Update `pnpm-workspace.yaml`: Remove `"design-system"` entry. Result should be:
        ```yaml
        packages:
          - "apps/*"
          - "packages/*"
        ```
    *   Update root `package.json`: Rename from `ecosystem-monorepo` to `sage-design-engine`.
    *   Rewrite `README.md` for a professional SDE audience (remove personal project references).
    *   Remove or rewrite `AGENTS.md` / `CHANGELOG.md` — these are ecosystem-specific. Start a fresh CHANGELOG for the SDE repo.
    *   Keep `DESIGN-PHILOSOPHY.md` — it's relevant to the design system.
4.  **Sanitize docs/:**
    *   Keep: `ENTERPRISE-INTEGRATION-GUIDE.md`, `mcp-setup.md`, `SDE-3RD-PARTY-OPTIMIZATION-PLAN.md`
    *   Remove: `SAGE_REPO_SPLIT_PLAN.md` (this document — it's internal planning), `archive/`
    *   Review `plan-to-improve-sde-to-a-plus.md` — keep if relevant, remove if too personal.
5.  **Sanitize AI context files:**
    *   Remove `.claude/` and `.agent/` (these reference ecosystem-specific workflows). Create new, SDE-scoped versions if desired.
6.  **Clean up `.github/workflows`:**
    *   `ci.yml`: Currently only tests `@thesage/ui` — should work as-is. Verify `pnpm build` doesn't fail without personal apps.
    *   `release.yml`: Works as-is (changeset-based).
    *   `auto-merge.yml`: Works as-is.
7.  **Initialize git & push:**
    ```bash
    cd sage-design-engine
    git init
    git add .
    git commit -m "feat: initial commit — Sage Design Engine"
    git remote add origin <speedboat-sandbox-url>
    git push -u origin main
    ```
8.  **Configure GitHub repo secrets:**
    *   `NPM_TOKEN` — for publishing to NPM
    *   `GH_TOKEN_FOR_CI` — for changeset PR creation and auto-merge (this is the secret name used in the workflows, not `GH_TOKEN`)
9.  **Reconnect Vercel:** Point the Studio deployment (`thesage.dev`) to the new repo's `apps/web`.
10. **Verify:** Run `pnpm install && pnpm build` in the new repo. Confirm Studio launches locally.

**Success Criteria:**
- [ ] `pnpm install && pnpm build` passes in the new repo
- [ ] `pnpm dev --filter web` launches Studio successfully
- [ ] `pnpm --filter @thesage/ui test` passes
- [ ] No references to `portfolio`, `creative-powerup`, `sage-stocks`, `sageos`, or `mobile` remain
- [ ] GitHub Actions run successfully on push to main

---

### Phase 3: The "Consumer" Refactor (Updating Old Repo)
**Goal:** Convert `ecosystem` into a purely consumer repository.

1.  **Update dependencies:** In every app's `package.json`:
    *   **Change:** `"@thesage/ui": "workspace:*"` → `"@thesage/ui": "^1.1.1"` (use versions from Phase 1)
    *   Repeat for all `@thesage/*` packages.
2.  **Update `pnpm-workspace.yaml`:** Remove `"packages/*"` and `"design-system"` entries:
    ```yaml
    packages:
      - "apps/*"
    ```
3.  **Prune packages (staged approach):**
    *   Week 1: Leave `packages/` in place but ensure no app references `workspace:*`. Run builds to confirm apps resolve from NPM.
    *   Week 2+: Delete `packages/` once confident.
4.  **Clean up root configs:**
    *   Remove changeset config (`.changeset/`) — this repo no longer publishes.
    *   Remove `scripts/append-changelog-date.js`.
    *   Simplify root `package.json` scripts (remove `release`, `version-packages`, `changeset`).
    *   Update `turbo.json` if needed (no more package build dependencies).
5.  **Simplify CI:** Remove or simplify `.github/workflows/release.yml` and `auto-merge.yml` — this repo no longer publishes to NPM.
6.  **Test every app:**
    *   `pnpm dev --filter portfolio`
    *   `pnpm dev --filter creative-powerup`
    *   `pnpm dev --filter sage-stocks`
    *   `pnpm build` (all apps)

**Success Criteria:**
- [ ] Zero `workspace:*` references remain for `@thesage/*` packages
- [ ] `pnpm install` resolves all `@thesage/*` from NPM registry
- [ ] All apps build and run correctly
- [ ] No broken imports

---

### Phase 4: Workflow Establishment
**Goal:** Define how to work across two repos day-to-day.

1.  **Feature Development (SDE changes):**
    *   Make changes in `sage-design-engine`
    *   Run `pnpm changeset` and merge to main
    *   Automated release publishes to NPM
2.  **App Updates (consuming new SDE versions):**
    *   In `ecosystem`: `pnpm update @thesage/ui` (or specific packages)
    *   Build, test, deploy
3.  **Local "Link" for Fast Iteration:**
    *   When hacking on SDE while testing in Portfolio:
    ```bash
    # In sage-design-engine
    cd packages/ui && pnpm link --global

    # In ecosystem
    cd apps/portfolio && pnpm link --global @thesage/ui
    ```
    *   Document this in both repos' READMEs.
    *   Consider `yalc` as an alternative — it handles edge cases better than `pnpm link`.

---

## 6. Rollback Plan

If something goes wrong at any phase:

| Phase | Rollback |
| :--- | :--- |
| Phase 1 (Publish) | No-op — publishing is additive, doesn't break anything |
| Phase 2 (New repo) | Delete the new directory / GitHub repo. Original `ecosystem` is untouched |
| Phase 3 (Consumer refactor) | `git checkout .` in `ecosystem` to revert `package.json` changes back to `workspace:*` |
| Phase 4 (Workflow) | N/A — this is process, not code |

The original `ecosystem` monorepo remains fully functional and git-tracked throughout. Nothing is destroyed until you explicitly choose to clean up.

---

## 7. Next Steps

1.  **Review and approve this plan.**
2.  **Execute the Pre-Flight Checklist** (Section 4).
3.  **Execute Phase 1** (Publish latest versions to NPM).
4.  **Execute Phase 2** (Create and push the new repo).
5.  **Execute Phase 3** (Convert `ecosystem` to consumer).
6.  **Document the workflow** (Phase 4).

---

## Appendix A: Package Version Inventory (as of 2026-02-16)

All 8 packages are currently published to NPM and **every published version matches the local version exactly**. If any local changes are made before executing Phase 1, a new changeset + publish is required.

| Package | Local Version | NPM Version | Match? |
| :--- | :--- | :--- | :--- |
| `@thesage/ui` | 1.1.1 | 1.1.1 | Yes |
| `@thesage/tokens` | 0.0.3 | 0.0.3 | Yes |
| `@thesage/hooks` | 0.1.2 | 0.1.2 | Yes |
| `@thesage/charts` | 0.2.0 | 0.2.0 | Yes |
| `@thesage/core` | 0.0.1 | 0.0.1 | Yes |
| `@thesage/mcp` | 0.8.2 | 0.8.2 | Yes |
| `@thesage/utils` | 0.1.0 | 0.1.0 | Yes |
| `@thesage/config` | 0.0.3 | 0.0.3 | Yes |

---

## Appendix B: Complete `workspace:*` Dependency Map

### Consumer Apps → Packages (these become NPM version pins in Phase 3)

| App | `@thesage/*` Dependencies |
| :--- | :--- |
| `apps/portfolio` | `ui` |
| `apps/creative-powerup` | `ui`, `config` |
| `apps/mobile` | `ui`, `tokens`, `config` |
| `apps/sage-stocks` | **None** — standalone app, no `@thesage/*` deps |
| `apps/sageos` | **TBD** — verify before executing |

**Key finding:** `apps/sage-stocks` has zero `@thesage/*` dependencies. It uses Notion API, LLM providers (Anthropic/Google/OpenAI), and Upstash Redis. It requires no version pinning during the split.

### Producer App → Packages (these stay as `workspace:*` in the new repo)

| App | `@thesage/*` Dependencies |
| :--- | :--- |
| `apps/web` | `ui`, `tokens`, `hooks`, `charts`, `core`, `mcp`, `config` (all 7 runtime + config as dev) |

### Inter-Package Dependencies (stay as `workspace:*` in the new repo)

| Package | Depends On |
| :--- | :--- |
| `@thesage/ui` | `@thesage/config` (dev) |
| `@thesage/core` | `@thesage/config` (dev), `@thesage/tokens` (dev) |
| `@thesage/charts` | `@thesage/config` (dev) |
| `@thesage/hooks` | `@thesage/config` (dev) |
| `@thesage/tokens` | None |
| `@thesage/mcp` | None |
| `@thesage/utils` | None |
| `@thesage/config` | None |

---

## Appendix C: Exact Phase 3 Version Pin Commands

When converting `ecosystem` to a consumer repo, apply these exact changes:

**`apps/portfolio/package.json`:**
```diff
- "@thesage/ui": "workspace:*"
+ "@thesage/ui": "^1.1.1"
```

**`apps/creative-powerup/package.json`:**
```diff
- "@thesage/ui": "workspace:*"
- "@thesage/config": "workspace:*"
+ "@thesage/ui": "^1.1.1"
+ "@thesage/config": "^0.0.3"
```

**`apps/mobile/package.json`:**
```diff
- "@thesage/ui": "workspace:*"
- "@thesage/tokens": "workspace:*"
- "@thesage/config": "workspace:*"
+ "@thesage/ui": "^1.1.1"
+ "@thesage/tokens": "^0.0.3"
+ "@thesage/config": "^0.0.3"
```

**`apps/sage-stocks/package.json`:** No changes needed (no `@thesage/*` deps).

**`apps/sageos/package.json`:** Verify dependencies before executing.

---

## Appendix D: Environment Variables & Secrets

### GitHub Repository Secrets (new `sage-design-engine` repo)

These must be configured in **GitHub → Settings → Secrets and variables → Actions** before CI will pass:

| Secret Name | Purpose | Used By |
| :--- | :--- | :--- |
| `GH_TOKEN_FOR_CI` | Create release PRs, approve PRs, enable auto-merge | `release.yml`, `auto-merge.yml` |

> **Note (2026-02-22):** `NPM_TOKEN` is no longer needed. The ecosystem now uses npm Trusted Publishing via GitHub OIDC (`publish.yml` with `id-token: write`). See [CICD-PIPELINE.md](CICD-PIPELINE.md) for details. If the new `sage-design-engine` repo adopts the same approach, configure Trusted Publishers on npmjs.com instead of creating an npm token.

**Important:** The workflow files reference `secrets.GH_TOKEN_FOR_CI` — not `GH_TOKEN` or `GITHUB_TOKEN`.

### Vercel Environment Variables for `apps/web` (Sage Studio)

From `apps/web/.env.example.edge`:

| Variable | Purpose | Required? |
| :--- | :--- | :--- |
| `EDGE_CONFIG` | Vercel Edge Config connection string | For edge features |
| `EDGE_CONFIG_ID` | Edge Config store ID | For edge features |
| `VERCEL_API_TOKEN` | Vercel API access | For edge features |
| `VERCEL_TEAM_ID` | Vercel team identifier | For edge features |

### Turbo Global Env Pass-Through

`turbo.json` declares `CACHE_BUST_2026_01_11_V2` as a global pass-through env var. This forces cache invalidation. It can be kept or removed in the new repo — it's a no-op if unset.

---

## Appendix E: Vercel Deployment Reconfiguration

### Current Vercel Config for `apps/web`

**`apps/web/vercel.json`:**
```json
{
  "buildCommand": "pnpm turbo run build --filter=web",
  "installCommand": "pnpm install"
}
```

This uses Turbo's `--filter=web` which automatically builds all dependencies (packages) first due to `^build` in `turbo.json`. This config works as-is in the new repo.

### Steps to Reconnect

1. In Vercel dashboard, create a new project (or reassign) pointing to the `sage-design-engine` repo in `speedboat-sandbox`
2. Set root directory to repo root (not `apps/web`) — Turbo needs the full workspace
3. Configure the env vars from Appendix D
4. Verify the build command in `vercel.json` still works: `pnpm turbo run build --filter=web`
5. Update DNS for `thesage.dev` if the Vercel project changes

### Consumer Apps Stay Unchanged

`apps/portfolio/vercel.json` and `apps/creative-powerup/vercel.json` continue pointing to the `ecosystem` repo. Their Vercel build commands still work because they no longer need Turbo's `^build` to build packages first — they'll pull pre-built packages from NPM.

**However:** Once `packages/` is removed from `ecosystem`, the Turbo `^build` dependency chain is gone. The `vercel.json` build commands that use `pnpm turbo run build --filter=<app>` will still work, but `turbo.json`'s `dependsOn: ["^build"]` becomes a no-op (no upstream packages to build). This is fine — it degrades gracefully.

---

## Appendix F: `transpilePackages` Consideration

### Current State

Several `next.config` files use `transpilePackages` to handle workspace-linked packages:

| App | `transpilePackages` |
| :--- | :--- |
| `apps/web/next.config.mjs` | `['@thesage/ui', '@thesage/mcp']` |
| `apps/portfolio/next.config.mjs` | `['@thesage/ui']` |
| `apps/creative-powerup/next.config.js` | `['@thesage/ui', '@thesage/tokens']` |

### In the New Repo (`sage-design-engine`)

`apps/web` continues using `workspace:*` for all packages. **No changes needed** — `transpilePackages` stays as-is.

### In the Consumer Repo (`ecosystem`)

When consuming from NPM (pre-built packages), `transpilePackages` is **still needed** because `@thesage/ui` publishes ESM that Next.js needs to transpile for compatibility. Keep these entries. If builds fail with module resolution errors, this is the first thing to check.

**Known gotcha with `@thesage/utils`:** This package uses a **source export** (`"main": "./src/index.ts"`) — it points to raw TypeScript, not built output. When consumed from NPM, this should work because tsup builds it before publish, but verify the published package has proper `dist/` output. If it doesn't, consumers will get TypeScript compilation errors.

---

## Appendix G: Root Config Files to Copy/Modify

### Files to Copy to `sage-design-engine` (modify as noted)

| File | Action |
| :--- | :--- |
| `package.json` | Copy. Rename `name` to `sage-design-engine`. Keep `pnpm.overrides` (React 19 enforcement). Keep all scripts. |
| `pnpm-workspace.yaml` | Copy. Remove the stale `"design-system"` entry. Keep `"apps/*"` and `"packages/*"`. |
| `turbo.json` | Copy as-is. |
| `.gitignore` | Copy as-is. |
| `.changeset/config.json` | Copy as-is. |
| `scripts/append-changelog-date.js` | Copy as-is (used by `version-packages` script). |
| `DESIGN-PHILOSOPHY.md` | Copy as-is. |
| `README.md` | **Rewrite entirely** for Moloco/professional audience. |
| `.github/workflows/ci.yml` | Copy as-is (already scoped to `@thesage/ui`). |
| `.github/workflows/release.yml` | Copy as-is. |
| `.github/workflows/auto-merge.yml` | Copy as-is. |

### Files to NOT Copy (ecosystem-specific)

| File | Reason |
| :--- | :--- |
| `AGENTS.md` | 58 KB of ecosystem-specific AI agent context |
| `CHANGELOG.md` | 147 KB of ecosystem-wide history — start fresh |
| `.claude/CLAUDE.md` | References all personal apps, ecosystem-specific workflows |
| `.claude/settings.local.json` | Local AI tool permissions |
| `.agent/workflows/*` | References ecosystem-specific registration flows |
| `docs/SAGE_REPO_SPLIT_PLAN.md` | Internal planning document |
| `docs/archive/` | Historical/deprecated docs |

### Files to Keep in `ecosystem` but Modify

| File | Modification |
| :--- | :--- |
| `package.json` | Remove `changeset`, `version-packages`, `release` scripts. Remove `@changesets/cli` devDep. Keep `pnpm.overrides`. |
| `pnpm-workspace.yaml` | Remove `"packages/*"` and `"design-system"`. Keep only `"apps/*"`. |
| `turbo.json` | Remove `dependsOn: ["^build"]` from build task (no upstream packages). Or leave it — it degrades gracefully. |
| `.changeset/` | Delete entirely. |
| `scripts/` | Delete entirely. |
| `.github/workflows/release.yml` | Delete (no longer publishing). |
| `.github/workflows/auto-merge.yml` | Delete (no changeset PRs). |
| `.github/workflows/ci.yml` | Simplify — remove `@thesage/ui`-specific lint/test/size steps. Just build apps. |

---

## Appendix H: Complete File Manifest for `sage-design-engine`

After copying from `ecosystem` and pruning, the new repo should contain exactly:

```
sage-design-engine/
├── .changeset/
│   ├── config.json
│   └── README.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── auto-merge.yml
├── .gitignore
├── apps/
│   └── web/                    # Sage Studio (only app)
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── public/
│       ├── next.config.mjs
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── vercel.json
├── docs/
│   ├── CICD-PIPELINE.md
│   ├── ENTERPRISE-INTEGRATION-GUIDE.md
│   ├── mcp-setup.md
│   └── SDE-3RD-PARTY-OPTIMIZATION-PLAN.md
├── packages/
│   ├── charts/
│   ├── config/
│   ├── core/
│   ├── hooks/
│   ├── mcp/
│   ├── tokens/
│   ├── ui/
│   └── utils/
├── scripts/
│   └── append-changelog-date.js
├── DESIGN-PHILOSOPHY.md
├── README.md                   # NEW — written for professional audience
├── CHANGELOG.md                # NEW — fresh, starting from initial commit
├── package.json                # Modified — name: sage-design-engine
├── pnpm-workspace.yaml         # Modified — no design-system entry
└── turbo.json
```

---

## Appendix I: Known Gotchas & Edge Cases

### 1. `@thesage/utils` Source Export
`@thesage/utils` has `"main": "./src/index.ts"` in its `package.json`, pointing to raw TypeScript source rather than built output. Verify that the npm-published version includes a proper `dist/` folder with compiled JS. If not, consumer apps will fail with TypeScript errors when importing from NPM.

**How to check:** `npm pack @thesage/utils --dry-run` and inspect the file list.

### 2. `pnpm.overrides` Must Exist in Both Repos
The root `package.json` contains React 19 overrides that force all packages to use `react@^19.2.1`. Both repos need these overrides, or peer dependency resolution will break:
```json
"pnpm": {
  "overrides": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  }
}
```

### 3. `apps/mobile` Uses `package-lock.json`
The `apps/mobile` directory contains a `package-lock.json` (npm lockfile) alongside the pnpm workspace. This may cause confusion. It's a React Native / Expo app and may have been initialized separately. Verify it still works within the pnpm workspace after the split.

### 4. `apps/creative-powerup` Has a Custom Build Skip Script
Its `vercel.json` references `bash ignore-build.sh` as a git ignore command. Make sure this script exists and is retained in the `ecosystem` repo.

### 5. `apps/sage-stocks` Is Not a Next.js App
Unlike the other web apps, `sage-stocks` is a pure Vercel Serverless Functions project (no Next.js). It has its own complex `vercel.json` with 7 function definitions, 4 cron jobs, rewrites, and CORS headers. It also has **live credentials** in `.env` (Notion API keys). Ensure these are not accidentally committed or moved.

### 6. `packageManager` Field
Root `package.json` specifies `"packageManager": "pnpm@10.26.1"`. Both repos should keep this to ensure consistent pnpm behavior. If Corepack is enabled, this field enforces the exact pnpm version.

### 7. `devDependencies` That Can Be Cleaned Up
Root `package.json` has `@types/jscodeshift` and `jscodeshift` as devDependencies — these were likely used for a one-time codemod (the `@ecosystem/design-system` → `@thesage/ui` migration). They can be safely removed from both repos.
