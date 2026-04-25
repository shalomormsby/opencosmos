/**
 * Typed wrapper around window.CustomEvent for cross-surface Cosmo coordination.
 *
 * Primary purpose: scaffolding for Phase 5+ (`@opencosmos/constellation`). When
 * the graph ships, it subscribes to these events to sync with the chat sidebar
 * and vice-versa. Today, only `selected-section` has a live emitter (the
 * knowledge TableOfContents); other contracts are defined up-front so the
 * graph can plug in without touching existing call sites.
 *
 * Why window events over a store: matches the postMessage pattern already
 * planned in docs/pm.md Phase 8, keeps zero state-mgmt dependencies in a
 * codebase that currently has none, and gracefully degrades when listeners
 * aren't mounted (e.g. /account, /dialog without the sidebar).
 */

type Events = {
  /** Reader has moved to a new section; cosmo_context sessionStorage has been updated. */
  'selected-section': {
    doc_path: string
    doc_title: string
    heading: string
    passage?: string
  }

  /** Graph click → pan/zoom request. Future: chat may react by scoping context. */
  'focus-node': { node_id: string }

  /** Chat response → graph should glow these nodes (e.g. RAG hit highlights). */
  'highlight-nodes': { node_ids: string[] }

  /** Start a new dialog, optionally seeded with a scope (e.g. a clicked graph node). */
  'open-dialog': { scoped_to?: string }
}

type EventType = keyof Events
type EventPayload<T extends EventType> = Events[T]

const PREFIX = 'cosmo:'

export function emitCosmoEvent<T extends EventType>(type: T, detail: EventPayload<T>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(`${PREFIX}${type}`, { detail }))
}

export function onCosmoEvent<T extends EventType>(
  type: T,
  handler: (payload: EventPayload<T>) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<EventPayload<T>>).detail
    handler(detail)
  }
  window.addEventListener(`${PREFIX}${type}`, listener)
  return () => window.removeEventListener(`${PREFIX}${type}`, listener)
}

export type { EventType as CosmoEventType, EventPayload as CosmoEventPayload }
