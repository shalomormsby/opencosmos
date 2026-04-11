---
name: knowledge-lookup
description: Search the knowledge wiki for synthesis relevant to a query. Returns pre-built concept pages, entity summaries, and cross-tradition connections before a domain conversation begins.
argument-hint: "<query>"
disable-model-invocation: true
user-invocable: true
---

# /knowledge-lookup — Wiki Search Skill

Search the knowledge wiki for existing synthesis relevant to `$ARGUMENTS`. Returns pre-built concept pages and connections so you don't have to synthesize from scratch.

The canonical use case: before asking Cosmo a deep cross-tradition question, run `/knowledge-lookup <topic>` to see what the wiki already knows.

---

## Step 1: Parse the Query

Read `$ARGUMENTS` as a free-text query. Examples:
- `/knowledge-lookup impermanence`
- `/knowledge-lookup what plato says about the good`
- `/knowledge-lookup self identity soul`
- `/knowledge-lookup cosmology origin`

---

## Step 2: Search the Wiki Index

Read `knowledge/wiki/index.md`. Find all entries whose titles or summaries are semantically related to the query. Rank by relevance.

---

## Step 3: Read Matching Pages

For each relevant page found (up to 5), read the full file and extract:
- The `## Summary` section
- The `## Key Claims` section
- The `## Connections` section (for navigation)
- `confidence` and `status` from frontmatter

---

## Step 4: Report Results

Output a structured result:

```
## /knowledge-lookup: "<query>"

---

### [Article Title](wiki/path/filename.md)
**Confidence:** high | medium | speculative  **Status:** active

**Summary:** [one-paragraph synthesis from the article]

**Key Claims:**
- Claim 1
- Claim 2

**Connects to:** [[related-page]] · [[other-page]]

---

[next article...]

---

### Not in wiki yet
The following aspects of your query are not covered by existing wiki pages:
- [gap 1]
- [gap 2]

Run `/knowledge-compile convo` after this session to add them.
```

---

## Step 5: Source Recommendations (if gaps exist)

If the query touches topics not covered by wiki pages, check `knowledge/wiki/index.md` and suggest which source documents in the corpus are most likely to contain relevant primary material:

```
### Relevant Source Documents (not yet synthesized)
- sources/philosophy-phaedo.md — covers Platonic soul, relevant to your query on identity
- sources/buddhism-the-dhammapada.md — Chapter N covers impermanence
```

This helps the user know where to look even when no wiki page exists yet.
