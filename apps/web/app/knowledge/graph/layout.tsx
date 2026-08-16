import { KnowledgeShell } from '../KnowledgeShell'

/**
 * The constellation shares the library's shell so Cosmo sits beside the map.
 *
 * This is the point of the page: the events in `lib/cosmo-events.ts` are
 * `window` CustomEvents, which only reach listeners in the same document — so
 * for a citation in a response to light up a node, the chat and the graph have
 * to be on the same surface. They are now.
 */
export default function GraphLayout({ children }: { children: React.ReactNode }) {
  return <KnowledgeShell>{children}</KnowledgeShell>
}
