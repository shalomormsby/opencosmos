import { InceptionProvider } from './InceptionContext'
import { InceptionShell } from './InceptionShell'
import { InceptionInset } from './InceptionInset'

export const metadata = {
  title: 'Inception — OpenCosmos',
  description: 'Bring a personal AI agent into being. Cosmo draws it out of you; it goes home with you.',
}

// Mirrors the /knowledge pattern: a Cosmo dialog sidebar (InceptionShell) with the
// work in the Inset. Here the "work" is the agent's blueprint, and Cosmo's sidebar
// chat conducts the interview that fills it.
export default function InceptionPage() {
  return (
    <InceptionProvider>
      <InceptionShell>
        <InceptionInset />
      </InceptionShell>
    </InceptionProvider>
  )
}
