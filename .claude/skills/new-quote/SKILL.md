---
name: new-quote
description: Add one or many quotes to the OpenCosmos corpus. Parses free-form input, checks for duplicates, infers category and keywords, validates provenance, and routes the record into the right pool.
argument-hint: "<paste a quote, or several>"
disable-model-invocation: true
user-invocable: true
---

# /new-quote — Add a quote to the corpus

**Full pipeline:** `/new-quote` → `pnpm quotes:add` → `pnpm quotes:promote` → `pnpm embed`

`$ARGUMENTS` is whatever Shalom pasted. It might be a bare line, a line with
`— Author` on the end, something copied out of a book with the citation
attached, or twenty quotes at once. Parse it; don't ask him to reformat.

## The one rule that matters

**Never write to `knowledge/quotes/*.yaml` or `pending.jsonl` yourself.**

`scripts/normalize-quotes/08-add-quote.ts` is the single enforcement point for
ID allocation, author-key normalization, routing, and duplicate detection. If
you hand-write YAML you will drift from it and corrupt the pools. Your job is
the judgment a CLI can't do — parsing, enrichment, provenance — then you hand
structured JSON to the script.

Pass quotes via `--json <file>`, never as `--text` flags. Quotes are full of
apostrophes, quotation marks, em-dashes and newlines; shell escaping will
eventually mangle one.

## What to do

### 1. Parse

Pull out `text` and `author` for each quote. Strip surrounding quotation marks
and the `—`/`--`/`~` before an attribution. If the author is genuinely absent,
use `Unknown` — the pipeline routes that to `anonymous.yaml` on its own. If a
print source came along with it ("*Thirst*, Beacon Press, 2006"), capture it as
`source`.

Reflect back what you parsed before writing anything. A misparsed author is
much cheaper to fix now than after promotion.

### 2. Check for duplicates

```bash
pnpm quotes:add -- --check-dupes --json <file>
```

Exits non-zero and prints matches as JSON if any text already exists across the
embeddable, pending, or archive pools. On a match, show Shalom the existing
record and ask whether to skip it or add anyway (`--allow-dupe`). Don't decide
for him — near-duplicates are sometimes genuinely distinct translations.

### 3. Enrich

Fill in what you can infer, and say what you inferred:

- **`category`** — one of the corpus's existing vocabulary: `insight`, `spirit`,
  `creativity`, `business`, `relationships`, `humor`, `design`. Pick the closest;
  don't invent a new one.
- **`keywords`** — three to five, lowercase, the concepts a person would search.
- **`context`** — a short descriptor of who the author is (`Poet`, `Stoic
  philosopher`, `Zen teacher`). This is load-bearing: `synthesizeTradition()`
  derives the tradition from it, and the tradition drives the graph and the
  browse filters. A quote with no context lands as `tradition: null`.
- **`favorite`** — only if Shalom says so.

### 4. Validate provenance

Run the quote through the same rules the backlog used —
`scripts/normalize-quotes/VALIDATION_PROMPT.md`. Read that file and apply it
honestly:

- Training knowledge only. **Never invent a print source or a Wikiquote URL.**
  A low-confidence `attributed_unverified` is a success; a fabricated citation
  is a failure, and worse than no verdict, because it launders a bad attribution
  into a corpus whose whole purpose is being trustworthy.
- Confidence is about the strength of the *attribution*, not how good the quote
  is. A beautiful line of unknown origin is a 0.15.
- Watch the misattribution magnets: Einstein, Gandhi, Churchill, Twain, Lincoln.

This is the payoff over a bare CLI: a well-attested quote gets its verdict at
capture time and can go live in the same interaction, instead of waiting for
the next validation tranche.

Put the verdict in the record's `provenance` block:

```json
{
  "text": "My work is loving the world.",
  "author": "Mary Oliver",
  "category": "spirit",
  "keywords": ["purpose", "love", "attention"],
  "context": "Poet",
  "provenance": {
    "status": "verified",
    "confidence": 0.97,
    "earliest_print_source": "\"The Messenger\", in Thirst, Beacon Press, 2006",
    "notes": "Opening line of the poem; attribution unambiguous."
  }
}
```

If Shalom has personally verified an attribution, set
`"reviewed_by_human": true` — that clears the promotion bar regardless of
confidence.

### 5. Add, promote, report

Write the JSON to a temp file, then:

```bash
pnpm quotes:add -- --json <file> --dry    # confirm routing and IDs
pnpm quotes:add -- --json <file>
pnpm quotes:promote                        # only moves what clears the bar
pnpm quotes:lint
```

Then tell him, concretely:

- Where each quote landed — `knowledge/quotes/<bucket>.yaml`, or still pending
- Its provenance status and confidence
- For anything promoted, its page: `/knowledge/quotes/<bucket>#<id>`
- That it becomes citable by Cosmo on the next `pnpm embed` (or automatically
  via CI on push to main, per `.github/workflows/knowledge-sync.yml`)

Offer to run `pnpm embed` if he wants it live immediately.

## Notes

- Quotes always enter the **pending** pool. `quotes:promote` is the only thing
  that moves records into `knowledge/quotes/`, and only for `verified` or
  `attributed` at confidence ≥ 0.80 or human-reviewed. Don't try to shortcut it.
- Anything left with null confidence is picked up automatically by the next
  `pnpm quotes:checkpoint remaining --write-batches` tranche, so an unvalidated
  add is never lost — just deferred.
- **Never run `pnpm quotes:migrate-from-source`.** It rebuilds both pools from
  the historical import and would discard every provenance verdict and review
  decision. It refuses without an explicit flag; leave it that way.
