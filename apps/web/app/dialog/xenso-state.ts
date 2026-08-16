/**
 * Hiding the Xensō state block from the player.
 *
 * In xenso mode Cosmo ends a turn that changed the quest with a fenced
 * ```xenso-state block carrying the record as JSON. It is bookkeeping, and
 * quest-spec is unambiguous that the player never sees plumbing — but the
 * markdown renderer happily turns the fence into a code block and prints the
 * JSON at the end of the reply. It reached a shared, public conversation that
 * way before anyone noticed, because a tidy JSON card looks deliberate.
 *
 * Stripping happens at RENDER time, not on the way into storage. The block has
 * to stay in the message history: until the /api/xenso storage route lands, it
 * is the only place the structured quest survives between turns, and Cosmo
 * rebuilds from it. Display and memory want different things here.
 */

/** Leading newline required, so Cosmo naming the block in prose won't trigger it. */
const FENCE = '\n```xenso-state'

/**
 * The visible half of an assistant message: everything before the state block.
 *
 * Also suppresses a *partially* arrived fence. This runs on every streamed
 * chunk, so without the second pass the opening backticks appear for a frame or
 * two at the end of each reply before the full marker completes — a visible
 * seam on a surface whose whole intent is quiet.
 *
 * Uses the FIRST occurrence deliberately: for display, failing toward hiding
 * too much beats leaking JSON. A parser recovering the state wants the last.
 */
export function stripXensoState(content: string): string {
  const at = content.indexOf(FENCE)
  if (at !== -1) return content.slice(0, at).trimEnd()

  for (let k = Math.min(FENCE.length - 1, content.length); k > 0; k--) {
    if (content.endsWith(FENCE.slice(0, k))) {
      return content.slice(0, content.length - k)
    }
  }
  return content
}
