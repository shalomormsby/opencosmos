---
title: "Ethical Curation: Copyright, Fair Use, and the Corpus Tiers"
role: guide
format: manual
domain: opencosmos
tags: [ethics, copyright, fair-use, corpus-tier, curation, knowledge-base]
audience: [creator, engineer, general]
complexity: foundational
summary: >
  Defines the three corpus tiers (source, commentary, reference) that govern
  how works enter the OpenCosmos knowledge base, grounded in ethical respect
  for authorship rights and alignment between means and ends.
curated_at: 2026-03-28
curator: shalom
source: original
corpus_tier: source
related_docs:
  - guides/opencosmos-knowledge-formatting-guide.md
  - guides/opencosmos-knowledge-publish-workflow.md
---

# Ethical Curation: Copyright, Fair Use, and the Corpus Tiers

> OpenCosmos is built on interconnection and generosity. How we build the corpus must reflect those same values. The means must match the ends.

For the knowledge base README, see [knowledge/README.md](../README.md).
For the publication workflow, see [opencosmos-knowledge-publish-workflow.md](opencosmos-knowledge-publish-workflow.md).

---

## The Ethical Test

The question is not only "is this legal?" but "does this honor the author?"

These authors are wisdom carriers. Their life's work deserves the same care we'd want for our own. The corpus should function as a **web of relationships** — pointing toward, contextualizing, bridging, and always sending the reader back to the source.

The deciding question:

> **Does our use drive people toward the original work, or replace it?**

If someone reads our summary and feels moved to seek out the original, we've amplified the author's work. If they feel they've gotten the gist and don't need the book, we've extracted from it. OpenCosmos amplifies. It does not extract.

---

## The Three Corpus Tiers

Every document in the knowledge base must declare a `corpus_tier` in its frontmatter. This field makes the ethical decision explicit and machine-readable.

### Tier 1: `source` — Full Text

**What it means:** The complete original work is reproduced in the corpus.

**When it's appropriate:** Only for works that are genuinely in the public domain or released under an open license.

**Public domain includes:**
- Ancient texts where copyright has expired (Plato, Marcus Aurelius, Lao-tzu, the Dhammapada, the Bhagavad Gita, etc.)
- Works published before 1929 in the United States (check jurisdiction-specific rules for other countries)
- Works explicitly released under open licenses (CC0, CC-BY, etc.)

**Important nuance — translations:** Many ancient texts are public domain in the original language, but popular English translations are copyrighted. Coleman Barks's Rumi is copyrighted. Modern translations of Dogen, the Upanishads, and other classical texts are often under copyright. Always verify the specific translation, not just the original work.

**What to look for:** Project Gutenberg texts, public domain translations, works with explicit open licensing.

**Frontmatter:** `corpus_tier: source`

### Tier 2: `commentary` — Curated Fair-Use Commentary

**What it means:** An original document written by an OpenCosmos curator that describes a copyrighted work's key ideas, includes limited direct quotation for illustration, and always directs the reader to the original.

**When it's appropriate:** For copyrighted works whose ideas are important to the corpus — modern authors, living authors, works under active copyright.

**Fair-use principles that govern this tier:**
- **Describe ideas in your own words.** Ideas cannot be copyrighted; expression can. You can explain the four questions of The Work — that's a method. You cannot reproduce pages of Byron Katie's prose.
- **Limited quotation only.** A few sentences, properly attributed, used for illustration — not reproduction. The quotation should serve commentary, not replace the need to read the original.
- **Always cite the source.** Full attribution: author, title, publisher, year.
- **Always recommend the original.** Every commentary document should explicitly direct the reader to engage with the original work. This is not just legal protection — it's the ethical core. We are a bridge, not a destination.
- **Transformative purpose.** Our commentary should add something the original doesn't provide on its own: cross-tradition connections, application to the OpenCosmos mission, contextual framing that serves the reader's journey.

**Examples of works that belong in this tier:**
- Byron Katie, *Loving What Is*
- Thich Nhat Hanh, *The Heart of Understanding*
- Donella Meadows, *Thinking in Systems*
- Mary Oliver, *Devotions*
- Fred Brooks, *The Mythical Man-Month*
- Eckhart Tolle, *The Power of Now*
- Carl Sagan, *Cosmos*
- Ram Dass, *Be Here Now*

**Frontmatter:** `corpus_tier: commentary`

### Tier 3: `reference` — Pointer Only

**What it means:** A reference entry that names the work, describes its relevance to the corpus, and directs the reader to it — without reproducing any content, not even brief quotation.

**When it's appropriate:**
- Works where even brief quotation feels ethically uncomfortable — particularly poetry, where the power lives entirely in the specific expression
- Works where fair-use commentary would not add meaningful value beyond what a citation provides
- Placeholder entries for works that may later be developed into full commentary

**What a reference entry looks like:** A short paragraph identifying the work, its author, its relevance to the OpenCosmos mission, and where to find it.

**Frontmatter:** `corpus_tier: reference`

---

## How This Integrates with the Pipeline

### During /groom

The `/groom` skill is the first human-in-the-loop step when text enters `knowledge/incoming/`. Before formatting, /groom checks whether the incoming text is a copyrighted work. If it is:
- **Flag it.** Report the copyright status and recommend the appropriate tier.
- **Do not format copyrighted full texts for corpus inclusion.** A full copyrighted work should not be groomed as a source — it needs to become a commentary (tier 2) or reference (tier 3) instead.
- **Public domain works proceed normally** through the formatting pipeline.

### During publication

The `pnpm knowledge:publish` workflow requires `corpus_tier` in frontmatter. The publish CLI validates:
- `source` tier documents must have a `source` field indicating public domain status or open license
- `commentary` tier documents must include attribution and a recommendation to seek the original
- `reference` tier documents are validated for minimal required fields

### In Cosmo's RAG

Cosmo handles tiers differently at retrieval time:
- **`source`** — Cosmo can draw directly from the text, quote it, and engage with it in depth
- **`commentary`** — Cosmo synthesizes from the commentary and may direct the person to the original work
- **`reference`** — Cosmo recommends the work but does not attempt to reproduce or summarize its content

---

## The Ideas vs. Expression Distinction

A foundational principle of copyright law — and of ethical curation:

- **Ideas cannot be copyrighted.** The concept of "interbeing," the four questions of The Work, the principle of leverage points in systems thinking — these are ideas. They can be taught, discussed, and applied freely.
- **Expression can be copyrighted.** The specific sentences Thich Nhat Hanh wrote about interbeing, Byron Katie's prose explaining The Work, Donella Meadows's particular formulations — these are expression.

The system prompts already model the right approach: they describe methodologies, name sources, and speak in their own voice. The corpus should follow the same pattern for copyrighted works.

---

## When in Doubt

Ask: **Would this author feel honored by how we're using their work?**

If the answer is yes — if we're amplifying their voice, directing people to their books, and treating their ideas with fidelity and care — proceed. If the answer is uncertain, err on the side of less reproduction, more attribution, and always a clear path to the original.

The corpus is not a library of extracted content. It is a web of relationships — each entry a node that connects to the living tradition it draws from. The authors are wisdom carriers. We honor them by pointing back to the source.
