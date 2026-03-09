# File Organization Guidelines

This document establishes file organization standards for the Stock Intelligence project to maintain a clean, navigable codebase.

## Core Principles

1. **Root directory is sacred** - Only essential, actively-maintained files
2. **Everything has a place** - No orphaned or misplaced files
3. **History is preserved** - Use `git mv` for all file moves
4. **Clear deprecation** - Add warnings to obsolete files before archiving

---

## Directory Structure

### Root Directory (Essential Files Only)

**Documentation (7 files):**
- `README.md` - Project overview and getting started
- `ARCHITECTURE.md` - System architecture and design decisions
- `CHANGELOG.md` - Version history and release notes
- `ROADMAP.md` - Current roadmap and future plans
- `API.md` - API documentation
- `SETUP.md` - Environment setup instructions
- `DEPLOYMENT.md` - Deployment guide

**Configuration (3 files):**
- `package.json` - Node.js dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vercel.json` - Vercel deployment configuration

**Environment:**
- `.env` - Local environment variables (gitignored)
- `.env.example` - Template for environment variables
- `.env.v1.example` - v1.0 specific env template

**Legal:**
- `LICENSE` - Project license

### `/docs/` - Documentation Archive

**Purpose:** All supplementary documentation that isn't essential for daily development.

**Subdirectories:**

#### `/docs/archive/`
Historical phase completion markers and implementation logs.

**When to add files here:**
- Phase completion markers (e.g., `ERROR_HANDLING_PHASE2_COMPLETE.md`)
- Build progress logs (e.g., `V1.0_BUILD_PROGRESS.md`)
- Session summaries from major development sprints
- Implementation milestone documents

**Naming convention:**
- Use UPPERCASE for historical markers
- Include phase/version number in filename
- Add date suffix if multiple docs for same phase

#### `/docs/guides/`
How-to guides and technical references for specific features.

**When to add files here:**
- Implementation guides (e.g., `RATE_LIMITING_SETUP.md`)
- Feature documentation (e.g., `POLLING.md`)
- Database templates and schemas
- Testing checklists
- Integration instructions

**Naming convention:**
- Use UPPERCASE for major guides
- Be descriptive (e.g., `NOTION_DATABASE_TEMPLATE.md`)
- Avoid version numbers (guides should be current)

**Timestamp requirement:**
- All guides must include a "Last updated" timestamp at the bottom
- Format: `*Last updated: Month DD, YYYY*`
- Update timestamp whenever content changes significantly

#### `/docs/legacy/`
Superseded version documentation that's no longer applicable.

**When to add files here:**
- Old version docs when major version changes (e.g., `V0.3.0_*`)
- Superseded README files (e.g., `README_V1.md`)
- Historical roadmap updates (e.g., `ROADMAP_UPDATE_v1.0.x.md`)
- Deprecated API documentation

**Lifecycle:**
- Move here when version is superseded
- Review quarterly - consider deletion after 6+ months
- Delete entirely once version is no longer in production

**Naming convention:**
- Preserve original filename (for git history)
- Version prefix helps identify age (e.g., `V0.3.0_*`)

### `/api/` - Vercel Serverless Functions

**Purpose:** Backend API endpoints deployed as serverless functions.

**Structure:**
- Root level: Main API endpoints (e.g., `analyze.ts`, `webhook.ts`)
- `/api/page/`: Page-specific handlers

**Guidelines:**
- One file per endpoint
- Keep handlers focused and modular
- Extract shared logic to `/lib/`

### `/lib/` - Shared Libraries

**Purpose:** Reusable modules, utilities, and business logic.

**Structure:**
- Root level: Core utilities (e.g., `notion-client.ts`, `rate-limiter.ts`)
- `/lib/llm/`: LLM provider abstraction layer

**Guidelines:**
- Pure functions preferred
- Single responsibility per module
- Export clear interfaces

### `/config/` - Configuration Modules

**Purpose:** Application configuration and constants.

**Structure:**
- `notion-schema.ts` - Notion database schemas
- `scoring-config.ts` - Scoring thresholds and weights

**Guidelines:**
- TypeScript configuration only (not environment vars)
- Exportable constants and types
- Well-documented defaults

### `/public/` - Static Assets

**Purpose:** Publicly accessible HTML, CSS, and client-side JavaScript.

**Structure:**
- `index.html` - Landing page
- `analyze.html` - Stock analyzer interface

**Guidelines:**
- WordPress-compatible (no build step)
- Vanilla JavaScript or CDN libraries
- Inline styles or CDN CSS

### `/scripts/` - Development Scripts

**Purpose:** Development, testing, and automation scripts.

**Structure:**
- TypeScript scripts (executed with `ts-node`)
- Test scripts (e.g., `test-analyze.ts`)
- Utility scripts (e.g., `poll-notion.ts`)

**Guidelines:**
- Register in `package.json` scripts
- Add clear descriptions
- Handle errors gracefully

### `/tests/` - Test Files

**Purpose:** Test suites and deprecated test code.

**Structure:**
- Root level: Current test files
- `/tests/deprecated/`: Obsolete test files with deprecation notices

**Guidelines:**
- Add deprecation warnings to obsolete files
- Use descriptive test names
- Keep tests close to code they test (consider co-location in future)

---

## Decision Tree: Where Does This File Go?

### New Documentation File

**Is it essential for daily development?**
- **Yes** → Root directory (e.g., `API.md`, `SETUP.md`)
- **No** → Continue to next question

**Is it a how-to guide or feature reference?**
- **Yes** → `/docs/guides/`
- **No** → Continue to next question

**Is it a phase completion marker or implementation log?**
- **Yes** → `/docs/archive/`
- **No** → `/docs/guides/` (default)

### Deprecated Documentation

**Is it superseded by a newer version?**
- **Yes** → `/docs/legacy/`
- **No** → `/docs/archive/`

### Test Files

**Is it actively used?**
- **Yes** → `/tests/` (root)
- **No** → `/tests/deprecated/` (with deprecation notice)

### Code Files

**Is it an API endpoint?**
- **Yes** → `/api/`

**Is it shared business logic?**
- **Yes** → `/lib/`

**Is it configuration?**
- **Yes** → `/config/`

**Is it a script?**
- **Yes** → `/scripts/`

---

## Documentation Standards

### Timestamps

**All documentation files must include a "Last updated" timestamp** to help readers immediately assess content freshness.

**Required format:**
```markdown
# Document Title

*Last updated: November 3, 2025 at 9:09 AM*

Document content starts here...
```

**Placement:**
- **At the top** of the file, immediately after the title
- On its own line, before the main content
- Italicized for visual distinction
- **Not at the bottom** (readers need to know freshness before reading)

**Format details:**
- Include both date and time: `Month DD, YYYY at HH:MM AM/PM`
- Use 12-hour format with AM/PM
- Italicized with single asterisks: `*Last updated: ...*`

**When to update:**
- Whenever content changes significantly
- After adding/removing sections
- When updating examples or instructions
- Not for minor typos (use judgment)

**Files requiring timestamps:**
- ✅ All root-level documentation (README.md, ARCHITECTURE.md, API.md, etc.)
- ✅ All `/docs/guides/` files
- ✅ `/docs/README.md` navigation guide
- ❌ CHANGELOG.md (has dated entries)
- ❌ `/docs/archive/` files (historical, frozen)
- ❌ `/docs/legacy/` files (superseded, frozen)

**Why top placement matters:**
- ✅ Immediately visible when opening file (no scrolling required)
- ✅ Readers can assess freshness before investing time reading
- ✅ Better UX than bottom placement
- ✅ Prevents wasting time on potentially outdated content
- ✅ Git commit dates aren't visible in file viewers

**Example:**

```markdown
# Setup Guide

*Last updated: November 3, 2025 at 9:09 AM*

Complete setup guide for beta testers and contributors.

---

## Installation

...content here...

## Configuration

...content here...
```

---

## File Movement Checklist

When moving files, follow this checklist:

1. **Use `git mv` (not `mv`)**
   ```bash
   git mv old/path/file.md new/path/file.md
   ```

2. **Add deprecation notices to obsolete code files**
   ```typescript
   // ⚠️  DEPRECATED - This file is no longer maintained or used.
   // ================================================================
   // This is legacy v0.x code kept for historical reference only.
   // Do not use in production.
   ```

3. **Update references in code**
   - Search for imports/requires of moved files
   - Update documentation links

4. **Test for breaking changes**
   ```bash
   npm run type-check
   npm run build
   ```

5. **Commit with clear message**
   - Use `Refactor:` prefix for reorganization
   - List moved files in commit body
   - Explain rationale

---

## Periodic Maintenance

### Quarterly Review (Every 3 Months)

**Review `/docs/archive/`:**
- Are phase completion markers still relevant?
- Can older logs be condensed into CHANGELOG entries?
- Are there duplicate documents?

**Review `/docs/legacy/`:**
- Is v0.x documentation still needed?
- Can we delete docs for versions no longer in production?
- Should we create a `v1.x-legacy/` subfolder?

**Review `/tests/deprecated/`:**
- Are deprecated tests still valuable as reference?
- Can we delete tests for removed features?

### After Major Version Release

**When releasing v2.0:**
- Move v1.0 phase docs to `/docs/archive/`
- Move superseded v1.0 guides to `/docs/legacy/v1.0/`
- Update root documentation to reflect v2.0

---

## Automated Enforcement (Future)

To ensure this structure is maintained, consider:

1. **Pre-commit hooks:**
   - Block commits adding markdown to root outside allowed list
   - Warn when adding files to deprecated directories

2. **CI/CD checks:**
   - Fail build if root directory has >15 files
   - Generate warnings for misplaced files

3. **Documentation linting:**
   - Validate file structure in CI
   - Auto-generate `/docs/README.md` table of contents

---

## Questions?

If you're unsure where a file should go, ask:
1. **Is this essential for daily development?** → Root
2. **Is this actively used?** → Appropriate subdirectory
3. **Is this historical/deprecated?** → Archive or legacy

**When in doubt:** Prefer `/docs/guides/` for new documentation.

---

*Last updated: November 3, 2025*
*Established: v1.0 (Project Structure Reorganization)*
