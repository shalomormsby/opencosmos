# Scripts

> Knowledge tooling and development utilities. All scripts run from the repo root via `pnpm`.

---

## Knowledge Scripts

### `pnpm knowledge:publish`

The full knowledge publication workflow — from raw text to graph-connected, git-committed, curation-logged document.

```bash
pnpm knowledge:publish knowledge/incoming/my-text.md
pnpm knowledge:publish knowledge/incoming/*.md --role source --domain buddhism
pnpm knowledge:publish knowledge/incoming/my-text.md --dry-run  # preview without writing
```

**What it does:**
1. Safety check (blocks if uncommitted tracked changes exist)
2. Claude API generates enriched frontmatter (title, role, domain, tags, author, era, tradition, summary)
3. Interactive review: accept all / edit in `$EDITOR` / cancel
4. Cross-reference suggestions (scores corpus by tag/domain overlap, warns if document would be an island)
5. Writes to `knowledge/{role}s/{domain}-{slug}.md`
6. Appends to `knowledge/CURATION_LOG.md`
7. Auto-links collection placeholders (`- [ ] Title` → `- [x] [Title](../path)`)
8. Safe git: branch → commit → push → optional PR
9. Cleans up source from `knowledge/incoming/`

**Key flags:**
- `--role <role>` — pre-set the role (source, commentary, reference, guide, collection)
- `--domain <domain>` — pre-set the domain
- `--accept` — accept Claude's frontmatter without interactive review
- `--branch <name>` — custom git branch name
- `--pr` — create a GitHub PR after pushing
- `--dry-run` — preview without writing or committing
- `--no-push` — commit locally, don't push
- `--no-clean` — keep source files in `incoming/` after publish

**Source:** `scripts/publish-knowledge.ts`

---

### `pnpm knowledge:health`

Corpus health diagnostic — the overhead map of what's present, what's missing, and where the connections are.

```bash
pnpm knowledge:health
```

**Output sections:**
- Overview: document count, domain coverage, graph density
- Domain coverage: visual bar chart, empty domains flagged
- Role coverage: sources vs commentary vs reference vs guides vs collections
- Foundation collection progress: `- [ ]` vs `- [x]` placeholder counts
- Cross-reference integrity: validates all `related_docs` point to existing files
- Islands: documents with zero incoming references
- Import priority: top texts to add next, scored by collection placeholder count and domain coverage

**Source:** `scripts/knowledge-health.ts`

---

### `pnpm knowledge:sync-dell`

Syncs the knowledge corpus to the local Open WebUI instance on the Dell Sovereign Node (RTX 3090) via Tailscale. Used for offline RAG access and retrieval testing.

```bash
pnpm knowledge:sync-dell
```

Decoupled from the publish workflow — run on-demand when the Dell is powered on and reachable. Idempotent.

**Source:** `scripts/sync-dell.ts`

---

## Development Scripts

### `scripts/test-cosmo-voice.ts`

Voice quality testing — runs sample prompts against Cosmo and each Triad voice to check for drift from the intended voice character.

### `scripts/check-byok-flags.ts`

Validates BYOK (Bring Your Own Key) configuration flags in the app.

---

## Module Library (`scripts/knowledge/`)

Shared modules imported by the knowledge scripts. Not intended to be run directly.

| Module | Purpose |
|--------|---------|
| `shared.ts` | Types, constants, corpus scanning, slugify |
| `frontmatter.ts` | Claude API frontmatter generation, interactive review UI, cross-reference scoring |
| `git.ts` | Safe git operations (never pushes to main, never uses destructive ops) |
| `groom.py` | Markdown formatting and cleanup for staged documents |
| `dell-sync.ts` | Open WebUI sync logic, extracted for reuse |

---

## Knowledge Workflow (Full Pipeline)

```
1. Stage
   pbpaste > knowledge/incoming/my-text.md

2. Groom (format the raw text)
   /groom knowledge/incoming/my-text.md

3. Publish (frontmatter + corpus indexing)
   pnpm knowledge:publish knowledge/incoming/my-text.md --role source --domain <domain>

4. Wiki update (synthesize into wiki)
   /knowledge-compile log
```

See [knowledge/guides/opencosmos-knowledge-wiki-workflow.md](../knowledge/guides/opencosmos-knowledge-wiki-workflow.md) for the full guide.
