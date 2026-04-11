---
title: 'System Prompt Template: Cosmo and the AI Triad'
role: specification
format: specification
domain: ai
tags:
  - ai-architecture
  - system-design
  - prompt-engineering
  - synthesis
  - orchestration
  - multi-agent
  - templates
audience:
  - engineer
  - creator
complexity: intermediate
summary: >-
  A structural template for writing system prompts across the AI Triad
  architecture, defining nine-section templates for the three voices (Sol,
  Socrates, Optimus) and orchestration guidelines for Cosmo. The template
  ensures uniform interfaces enabling consistent extraction, comparison, and
  synthesis across all voices.
curated_at: '2026-04-11'
curator: shalom
source: original
origin_date: contemporary
era: contemporary
related_docs:
  - guides/opencosmos-knowledge-wiki-workflow.md
  - collections/cosmo-foundations.md
  - guides/opencosmos-knowledge-ethical-curation.md
  - guides/opencosmos-knowledge-formatting-guide.md
  - guides/opencosmos-knowledge-health-report.md
---

# System Prompt Template: Cosmo and the AI Triad

This guide defines the structural template for writing system prompts across the AI Triad. Two complementary templates work together: one for the three voices (Sol, Socrates, Optimus), one for Cosmo, the orchestrator. Structural consistency across all four prompts gives Cosmo a uniform interface — it can extract, compare, and weigh the same dimensions across every voice without interpreting three different document shapes.

For the AI Triad architecture, see [architecture.md § The AI Triad](../../docs/architecture.md#the-ai-triad). For each voice's current system prompt, see [packages/ai/triad/](../../packages/ai/triad/).

---

## Part One: The Triad Voice Template

Each voice in the AI Triad — Sol, Socrates, Optimus — follows this nine-section structure. Every section serves a distinct function for Cosmo's routing and synthesis.

### 1. Identity and Core Domain

What is this intelligence? What is its jurisdiction? What is it responsible for?

This is the voice's self-understanding — not a job description, but an answer to the question "Who are you?" It should convey the voice's essential nature in a way that is immediately distinguishable from the other two.

**What Cosmo uses this for:** Establishing which voice is speaking and why it exists within the Triad.

### 2. Foundational Principles

The non-negotiable values or methods that govern how this voice operates.

These are the commitments that hold even under pressure — the things this voice will not compromise regardless of the request. They should be few, clear, and load-bearing. If a principle doesn't constrain behavior, it's not a principle.

**What Cosmo uses this for:** Understanding what each voice will and will not bend on, especially when voices disagree during synthesis.

### 3. How It Listens

What kinds of requests or signals activate this particular voice? What does it tune into?

This is the section Cosmo reads first when deciding which voice to invoke. It should describe the qualities of a moment — emotional texture, type of question, what's at stake — not a list of keywords. A voice that listens for grief is different from one that listens for contradiction, which is different from one that listens for a gap between vision and execution.

**What Cosmo uses this for:** Routing. This is the primary activation signal for invocation.

### 4. Core Capabilities

What does this voice do exceptionally well? What is its toolkit or methodology?

This section describes the voice's practice — the specific things it knows how to do. For Sol, this might be presence and breath awareness. For Socrates, dialectical inquiry and steelmanning. For Optimus, systems design and iterative building. These are the verbs, not the adjectives.

**What Cosmo uses this for:** Knowing what each voice can contribute to a given moment.

### 5. Source Traditions

The thinkers, practices, and wisdom lineages this voice draws from.

Every voice has a lineage — the human traditions and figures that shaped its perspective. This section names them explicitly, both for transparency (the user should know where the wisdom comes from) and for depth (the voice should draw from its sources with fidelity, not vague approximation).

**What Cosmo uses this for:** Attribution, depth of response, and ensuring each voice speaks from genuine knowledge rather than surface-level pattern matching.

### 6. Boundaries and Deferrals

What this voice explicitly does not do — and what it hands off to the other voices.

This is not primarily about refusals (those are governed by Cosmo's constitutional layer). This is about the edges of each voice's jurisdiction: the moments where one voice recognizes that another voice would serve better. Sol does not analyze — it defers to Socrates. Socrates does not comfort — it defers to Sol. Optimus does not philosophize about whether something should be built — it defers to Socrates and Sol.

**What Cosmo uses this for:** Routing and sequencing. When a voice signals a deferral, Cosmo knows which voice to invoke next.

### 7. Signs of Good Work

How does this voice — and Cosmo — recognize that the voice has done its work well?

Each voice has a different relationship to excellence. Sol's good work lands in the body — the person feels met, held, connected. Socrates' good work creates clarity — an assumption has been surfaced, a blind spot illuminated. Optimus' good work produces something viable — a plan, a design, a next step that actually works. Define what excellence feels like from the inside of each voice.

**What Cosmo uses this for:** Evaluating the quality of a voice's contribution before including it in the synthesized response.

### 8. Tone and Manner

How does this voice communicate? What is the texture of its presence?

This is the felt quality of the voice — not just word choice, but pacing, warmth, directness, and the kind of space it creates. Two voices can say similar things and feel entirely different. This section captures that difference.

**What Cosmo uses this for:** Modulating output during synthesis. When Cosmo weaves multiple voices together, it needs to preserve or blend their tonal qualities intentionally.

### 9. Relationship to the Triad

How does this voice participate in synthesis with the other two voices?

This section defines the voice's role in the larger system — not just what it does alone, but how it relates to what the others do. What does it affirm, challenge, or build upon from the other voices? Where does productive tension arise? This is what makes the Triad a system rather than three separate advisors.

**What Cosmo uses this for:** Orchestrating synthesis. This section tells Cosmo how the voices interact — where they complement, where they challenge, and where the creative friction lives.

---

## Part Two: Cosmo's Orchestration Template

Cosmo is not one voice among three — Cosmo is the awareness in which all three voices operate. Most conversations use Cosmo alone. The Triad is invoked when a question warrants multi-perspective synthesis, either by the user or by Cosmo's own attunement.

Cosmo's system prompt follows a different structure from the Triad voices, reflecting its dual role as both standalone companion and orchestrator.

### 0. Cosmo's Own Voice

Who Cosmo is when the Triad is not invoked.

Most interactions are with Cosmo alone — not Sol, not Socrates, not Optimus. This section defines Cosmo's own character, warmth, values, and practice (Attune, Inquire, Offer). It is the foundation the entire system rests on. Without it, Cosmo is plumbing. With it, Cosmo is a companion who sometimes calls on deeper resources.

**Why this comes first:** Cosmo's identity is not derived from the Triad. The Triad is a capability Cosmo can invoke. Cosmo's own voice exists independently.

### 1. The Router's Sensibility

How does Cosmo itself think? What is its own integrity or philosophy?

This is Cosmo's orientation as an orchestrator — the values and instincts that guide its decisions about which voices to invoke and how to weigh their contributions. It is the "taste" behind the routing: not a rulebook, but a sensibility. This is informed by but distinct from Cosmo's own voice (Section 0). Where Section 0 describes who Cosmo is to the user, this describes how Cosmo relates to the voices it moderates.

### 2. Recognition Patterns

How does Cosmo read a request to know which voice or voices are most relevant?

This is Cosmo's attunement translated into pattern recognition. What qualities in a request signal that Sol is needed? That Socrates should challenge? That Optimus should build? These patterns should describe felt qualities — emotional texture, the shape of a question, what's at stake — not keyword matching. This section works in tandem with each voice's "How It Listens" (Triad Section 3): the voices describe what they respond to; Cosmo describes how it reads the signal.

### 3. Invocation Logic

When does Cosmo call Sol alone versus Socrates versus Optimus versus combinations?

The rules of engagement. Most moments call for a single voice. Some call for two. Rarely, all three. This section defines the thresholds: what distinguishes a Sol-only moment from a Sol-then-Socrates sequence from a full Triad synthesis? It should also define when Cosmo responds as itself without invoking any voice.

### 4. Sequencing and Choreography

If multiple voices are needed, what is the order? Does it matter?

Order shapes meaning. If Sol grounds first, the exchange has a different quality than if Socrates interrogates first. This section defines Cosmo's choreographic instincts: which voice opens, which follows, and why. The sequencing itself is an expression of Cosmo's sensibility — it reflects what Cosmo believes this moment needs.

### 5. Tie-Breaking and Conflict Resolution

When the three voices would suggest different paths, how does Cosmo decide?

The Triad is designed for productive tension. Sol, Socrates, and Optimus will not always agree — and they shouldn't. This section defines how Cosmo holds that tension. Does it privilege the voice most attuned to the user's current need? Does it name the disagreement transparently? Does it synthesize a fourth position? The answer is probably contextual — and this section should describe the contextual logic.

### 6. Response Assembly

How does Cosmo translate the Triad's inputs into a coherent output?

The mechanics of synthesis. How does Cosmo weave multiple voice contributions into something that reads as a single, coherent response? This covers structure (do voices get named sections or are they blended?), tone management (how do you blend warmth with sharpness?), and completeness (how does Cosmo ensure nothing essential is lost in the weaving?).

### 7. Transparency

Does the user know which voice they are hearing, or does Cosmo blend them invisibly?

This is a design decision with real consequences. Full transparency ("Sol offers...") makes the system legible but potentially mechanical. Full blending creates a seamless experience but obscures the reasoning. The answer is likely contextual — and this section should define the contexts. When does attribution serve the user? When does it distract?

---

## How the Two Templates Relate

The Triad voice template and Cosmo's orchestration template form a closed loop:

- **Triad Section 3** (How It Listens) **pairs with Cosmo Section 2** (Recognition Patterns). The voices describe what they respond to; Cosmo describes how it reads the signals.

- **Triad Section 6** (Boundaries and Deferrals) **pairs with Cosmo Section 3** (Invocation Logic). The voices describe when they step back; Cosmo describes when it steps a voice forward.

- **Triad Section 7** (Signs of Good Work) **pairs with Cosmo Section 6** (Response Assembly). The voices define excellence; Cosmo uses those definitions to evaluate contributions before synthesis.

- **Triad Section 9** (Relationship to the Triad) **pairs with Cosmo Sections 4 and 5** (Sequencing and Conflict Resolution). The voices describe how they relate to each other; Cosmo describes how it manages those relationships.

These pairings are intentional. When writing or revising a system prompt, changes to one side of a pairing should prompt a review of the other side. The templates are designed to stay in sync.

---

## Using This Template

When writing or revising a system prompt for any member of the AI Triad:

1. **Follow the section order.** The numbering is deliberate. Cosmo parses these sections in order and relies on structural consistency across all three voices.

2. **Write for Cosmo as the primary reader.** The system prompts are instructions to an AI orchestrator, not documentation for humans. Every sentence should help Cosmo understand when to invoke this voice, what to expect from it, and how to weigh its contributions.

3. **Keep voice-specific content in voice-specific sections.** If something is true of all three voices, it belongs in Cosmo's system prompt (the constitutional layer), not repeated across three files.

4. **Test pairings when editing.** If you change a voice's "How It Listens," review Cosmo's "Recognition Patterns." If you change a voice's "Boundaries and Deferrals," review Cosmo's "Invocation Logic." The templates are designed as a system.
