import { KnowledgeShell } from '../KnowledgeShell'

// A route-group layout — wraps /knowledge and /knowledge/[...slug] in the
// shared shell. The shell (and its CosmoChatPanel) persists across navigations
// inside the group, so the dialog sidebar doesn't re-mount or re-scroll when
// switching corpus docs. /knowledge/graph is outside this group and keeps its
// own AppShell.
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <KnowledgeShell>{children}</KnowledgeShell>
}
