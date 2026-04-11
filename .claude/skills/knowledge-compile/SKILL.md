---
name: knowledge-compile
description: Compile durable insights into the knowledge wiki. Extracts cross-tradition synthesis from a conversation, incoming file, or recent CURATION_LOG entries, then writes or updates wiki pages and appends to wiki/log.md.
argument-hint: "convo | incoming/<file> | log"
disable-model-invocation: true
user-invocable: true
---

# /knowledge-compile — Wiki Compilation Skill

Compile durable insights from a source into `knowledge/wiki/`. The trigger for this skill is "I just learned something" — event-driven, not scheduled.

**Three modes, selected by `$ARGUMENTS`:**

- `convo` — extract from the current conversation
- `incoming/<file>` — process a specific staged document
- `log` — scan recent CURATION_LOG entries and update affected wiki pages

---

## Step 0: Parse Mode

Read `$ARGUMENTS`:
- If it starts with `incoming/` → **incoming mode**
- If it equals `log` → **log mode**
- If it equals `convo` or is empty → **convo mode**

---

## Step 1: Identify What to Compile

### Convo mode
Review the current conversation for durable, cross-tradition insights. Ask: "If I saved nothing else from this conversation, what single synthesis would be worth keeping?" Look for:
- A claim that connects two or more source documents in the corpus
- A contradiction between traditions that has been articulated clearly
- An open question worth tracking
- A confidence promotion — evidence that confirms a speculative wiki page

If nothing in the conversation meets this bar, report: "No durable synthesis found in this conversation — nothing to compile."

### Incoming mode
Read the file at `knowledge/$ARGUMENTS`. Identify the tradition, domain, key claims, and which existing wiki pages it would update or create.

### Log mode
Read `knowledge/CURATION_LOG.md`. Find entries added since the most recent `wiki/log.md` entry. For each new source document, determine which wiki pages are affected.

---

## Step 2: Check Existing Wiki Pages

Before creating, check whether a relevant wiki page already exists:

1. Read `knowledge/wiki/index.md` to scan current articles
2. If a matching page exists → update it (do not create a duplicate)
3. If no matching page exists → create a new one

**Where to create new pages:**
- A person, text, or tradition → `knowledge/wiki/entities/{slug}.md`
- A philosophical concept, theme, or idea → `knowledge/wiki/concepts/{slug}.md`
- An explicit comparison across two or more traditions → `knowledge/wiki/connections/{slug}.md`

---

## Step 3: Write or Update Wiki Pages

### For new pages

Create the file with this structure:

```yaml
---
title: "Page Title"
role: wiki
domain: <primary domain>
confidence: speculative|medium|high
status: active
synthesizes:
  - sources/path-to-source.md
last_reviewed: <today's date YYYY-MM-DD>
tags: [relevant, tags]
open_questions:
  - Any unanswered question this article surfaces
contradictions:
  - Source A says X; Source B says Y — unresolved
---

# Page Title

## Summary
One-paragraph synthesis. Front-load the key insight.

## Key Claims
- Claim 1 (falsifiable — link to specific source if possible)
- Claim 2

## Connections
- [[wiki/concepts/related-concept.md]] — reason for connection
- [[wiki/entities/related-entity.md]] — reason for connection

## Contradictions
One sentence per contradiction. Keep these honest — don't paper over real disagreements.

## Open Questions
- Unanswered question this page cannot resolve
```

**Confidence guidance:**
- `speculative` — interesting synthesis, not yet confirmed by multiple sources
- `medium` — supported by 2-3 source documents, no major contradictions
- `high` — well-established across 3+ sources, contradictions identified and documented

### For existing pages

Merge new information:
- Add to `synthesizes` list if new source documents are referenced
- Add new Key Claims if the incoming material adds them
- Add new Connections if relevant
- Add new Contradictions if sources disagree
- Add new Open Questions if surfaced
- Update `confidence` if promotion criteria are met (see below)
- Always update `last_reviewed` to today

**Confidence promotion criteria:**
- `speculative → medium`: 3+ source documents in `synthesizes`, claims are defensible
- `medium → high`: 4+ source documents, major contradictions documented, no major gaps

---

## Step 4: Update wiki/index.md

Add or update the entry for the new/modified page in the correct section of `knowledge/wiki/index.md`. Format:

```
| [filename.md](path/filename.md) | One-sentence summary — what this article synthesizes |
```

---

## Step 5: Append to wiki/log.md

Append a new line to `knowledge/wiki/log.md` in this format:

```
YYYY-MM-DD  CREATED|UPDATED|PROMOTED  wiki/path/filename.md  (note: what changed)
```

Examples:
```
2026-04-10  CREATED  wiki/concepts/impermanence.md  (synthesizes: dhammapada, tao-te-ching, leaves-of-grass; confidence: high)
2026-04-11  UPDATED  wiki/entities/plato.md  (added connection to impermanence.md)
2026-04-12  PROMOTED  wiki/concepts/logos-and-tao.md  (confidence: speculative → medium; added theaetetus reference)
```

---

## Step 6: Report

Output a structured summary:

```
## /knowledge-compile Report

**Mode:** convo | incoming/<file> | log
**Date:** YYYY-MM-DD

### Pages Created
- wiki/path/filename.md — one-line description

### Pages Updated
- wiki/path/filename.md — what changed

### No Action Taken
- Reason (if nothing was compiled)
```
