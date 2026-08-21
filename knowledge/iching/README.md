# The I Ching substrate

Sixty-four hexagrams and eight trigrams, held as a **keyed lookup table** rather than as corpus prose.

This is deliberate, and the reasoning is recorded in the Xensō canon at [`docs/corpus-wanted.md`](https://github.com/shalomormsby/xenso) § The oracular layer: *"The I Ching is a lookup system: sixty-four hexagrams with fixed keys, consulted by a cast rather than by similarity. The chunk-and-embed pipeline serves it badly. It wants a different data shape — closer to `knowledge/quotes/`."* So it sits beside the corpus, not inside it, and it is never embedded.

## The arrangement

One markdown file per unit; **the frontmatter is the source of truth**; the index is generated; the locks are machine-checked. This is the taoteching glossary's arrangement, copied because it works.

```
hexagrams/01.md … 64.md      the sixty-four, in King Wen order
trigrams/01-qian.md … 08-kun.md
```

Generated from these, and checked in:

```
apps/web/lib/iching-data.ts   GENERATED — do not edit
```

It is generated *into the app* rather than read from disk, because the cast happens on the client and `apps/web/lib/knowledge.ts`'s fs-from-cwd pattern is server-only. Sixty-four rows is a rounding error in the bundle.

```bash
pnpm xenso:seed-iching     # one-time; refuses to clobber anything past `status: draft`
pnpm xenso:build-iching    # markdown → apps/web/lib/iching-data.ts
pnpm xenso:check-iching    # the verification below
```

## What is a fact here, and what is a decision

**Facts** — seeded, and settled: the King Wen number, the character, the pinyin, the six-line figure, the trigram decomposition, and the Shuogua image in Chinese (乾為天, 坤為地, and so on).

**Decisions** — every English word. `render` is the single term a player sees, and it is a translation call made one at a time, in the form the [Tao Te Ching glossary](https://github.com/shalomormsby/taoteching) uses. All sixty-four are `status: draft` with `render: null` until then, and the interface shows `節 · hexagram 60` rather than inventing a name to fill the gap. **An invented name would be exactly the borrowed metaphor Xensō's design forbids, and it would arrive wearing authority.**

The slots for `judgment`, `image`, and `line_texts` are present and null from the beginning, so that adding the fuller text later is data entry rather than a migration.

## Why not Legge

Legge's *I Ching* (1882) is unambiguously public domain and is nonetheless not the source here. It renders 天 as "Heaven", 君子 as "the superior man", 王 as "the king" — precisely the missionary lexicon the taoteching [overlay audit](https://github.com/shalomormsby/taoteching) exists to strip. Importing it would install into this corpus the contamination the neighbouring project is systematically removing. Wilhelm–Baynes (1950) is in copyright and closed to `source` tier regardless.

Renderings are therefore original, and constrained by the Tao Te Ching locks — 天地 is locked to *sky and earth* with "heaven and earth" forbidden; 王 to *ruler / sovereign* with "king" forbidden. Once renderings start landing, a lock check against the vendored `terms.yaml` makes drift between the two projects impossible rather than merely discouraged.

## Verification

`pnpm xenso:check-iching` asserts, on every run:

- **Bijection** — 64 distinct figures covering all 64 possible.
- **The King Wen pair invariant** — consecutive pairs (1,2), (3,4) … (63,64) are each other's inversions, except the eight figures that are their own inversion, which pair by complement instead. A single transposed row breaks it, which makes the table self-checking and worth more than proofreading.
- **Trigram agreement** — lower ++ upper equals the figure, every time.
- **Engine behaviour** — coin arithmetic, the non-uniform odds (1/8, 3/8, 3/8, 1/8 — not even, and this is the check that says so), moving-line resolution, and `relating: null` when nothing moves.
- **The founding cast** — the six throws Shalom logged on 2024-02-23 asking *"What will help bring Xenso into the world?"*, recorded in the Xensō archive and never resolved, must come out at hexagram 60 moving at line one, becoming 29. It also asserts that reading those throws top-down would give 59 instead — because **lines read bottom to top**, and getting that backwards produces a plausible wrong answer with no error to notice.
