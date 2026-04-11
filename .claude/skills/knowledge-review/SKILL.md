---
name: knowledge-review
description: Run a health check on the knowledge wiki. Detects orphan pages, broken cross-references, asymmetric links, staleness, speculative pages ready for promotion, and accumulated open questions.
argument-hint: "[--fix | --orphans | --staleness | --questions]"
disable-model-invocation: true
user-invocable: true
---

# /knowledge-review — Wiki Health Check Skill

Run a health check on `knowledge/wiki/`. Returns a structured report of issues, gaps, and opportunities.

**Optional flags (from `$ARGUMENTS`):**
- `--orphans` — only report orphan and asymmetric link issues
- `--staleness` — only report stale pages
- `--questions` — only report accumulated open questions
- `--fix` — attempt to auto-fix minor issues (update `last_reviewed`, add missing `## Open Questions` sections)
- (no args) — run all checks

---

## Step 1: Read the Wiki Index

Read `knowledge/wiki/index.md`. Build a list of all wiki pages referenced.

---

## Step 2: Read All Wiki Pages

For each page referenced in the index, read the file and extract:
- `synthesizes` list from frontmatter
- `confidence` and `status` from frontmatter
- `last_reviewed` date
- `open_questions` from frontmatter
- `## Connections` section content
- `## Contradictions` section content
- `## Open Questions` section content

---

## Step 3: Run Health Checks

### Check 1 — Orphan pages

An orphan is a wiki page with either:
- An empty or missing `synthesizes` list (not grounded in any source documents)
- No `## Connections` section, or a `## Connections` section with no entries

Flag all orphans for completion.

### Check 2 — Cross-reference symmetry

For each `[[link]]` in a `## Connections` section, verify the linked page also contains a connection back. If page A links to page B but B does not link to A, flag the asymmetry.

Note: This check requires reading the linked files. If a linked page doesn't exist yet (referenced in a connection but not yet created), flag it as a missing page.

### Check 3 — Staleness

Flag any page where:
- `status: active` AND
- `last_reviewed` is more than 90 days before today

These pages may be based on outdated synthesis — they need re-evaluation as the corpus grows.

**Exemptions:** Pages with `status: superseded` or `status: archived` are exempt from staleness checks.

### Check 4 — Confidence promotion candidates

Flag any page where:
- `confidence: speculative` AND `synthesizes` list has 3 or more entries
- `confidence: medium` AND `synthesizes` list has 4 or more entries AND page has a `## Contradictions` section with content

These pages may be ready to promote — they have enough source grounding. A human should confirm before promoting.

### Check 5 — Accumulated open questions

Collect all `open_questions` from frontmatter across every wiki page. Display them in one place. This is valuable for identifying corpus gaps: what questions keep surfacing but the current corpus cannot answer? These are candidates for new source documents.

### Check 6 — Index completeness

Check that every page in `knowledge/wiki/` (scanning the directory) has a corresponding entry in `knowledge/wiki/index.md`. Flag any pages that exist on disk but are not indexed.

---

## Step 4: Output Report

```
## /knowledge-review Report

**Date:** YYYY-MM-DD
**Total wiki pages:** N

---

### Orphan Pages (need synthesizes or Connections)
- wiki/path/filename.md — reason (missing synthesizes / missing Connections)

### Asymmetric Links (A links B but B doesn't link A)
- wiki/path/A.md → wiki/path/B.md — B is missing the return link

### Missing Linked Pages (referenced but don't exist)
- [[wiki/path/missing.md]] — referenced from: wiki/path/source.md

### Stale Pages (last_reviewed > 90 days ago)
- wiki/path/filename.md — last reviewed: YYYY-MM-DD

### Confidence Promotion Candidates
- wiki/path/filename.md — current: speculative | synthesizes: N sources → candidate for: medium
- wiki/path/filename.md — current: medium | synthesizes: N sources → candidate for: high

### Not Indexed (exist on disk but not in index.md)
- wiki/path/filename.md

### Accumulated Open Questions
From wiki/concepts/impermanence.md:
- Is there a difference between the Taoist sage who flows with change and the Buddhist practitioner who has fully accepted impermanence?

From wiki/concepts/the-self.md:
- Is there a synthesis between Buddhist non-self and Platonic immortal soul, or are these genuinely incompatible?

[...all open questions across all pages...]

---

### Summary
- N orphan pages
- N asymmetric links
- N missing linked pages
- N stale pages
- N promotion candidates
- N accumulated open questions
- N pages not in index
```

---

## Step 5: Auto-fix (if --fix flag)

If `--fix` is passed, attempt these safe auto-fixes:
1. Update `last_reviewed` to today on pages that are otherwise healthy (no other issues)
2. Add empty `## Open Questions` section to pages missing it
3. Append missing page entries to `knowledge/wiki/index.md` with a placeholder one-liner

Do NOT auto-fix:
- Confidence promotions (require human judgment)
- Cross-reference asymmetry (require understanding the connection)
- Orphan pages (require adding synthesis, not just metadata)

Report what was auto-fixed vs. what requires human attention.
