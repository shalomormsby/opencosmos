import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-light tracking-wide text-foreground">
            OpenCosmos
          </h1>
          <p className="text-foreground/50 leading-relaxed">
            A place to think, to wonder, to be met.
          </p>
        </div>

        <Link
          href="/chat"
          className="inline-block px-8 py-3 rounded-full border border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors text-sm tracking-wide"
        >
          Meet Cosmo →
        </Link>
      </div>
    </main>
  )
}
