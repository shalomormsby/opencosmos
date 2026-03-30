import type { Metadata } from 'next';
import { ThemeProvider, CustomizerPanel, Button } from '@opencosmos/ui';
import { allFontVariables } from '@/lib/fonts';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Creative Sandbox | Creative Powerup',
  description: 'Experiments in Code, Art, & Play. A community playground for creative technologists.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={allFontVariables} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {/* Top Navigation */}
          <nav className="border-b border-[var(--color-glass-border)] bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Creative Sandbox</h1>
                    <p className="text-sm text-foreground/60">Experiments in Code, Art, & Play</p>
                  </div>
                </Link>

                <div className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    All
                  </Link>
                  <Link
                    href="/games"
                    className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    🎮 Games
                  </Link>
                  <Link
                    href="/visualizations"
                    className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    🌀 Visualizations
                  </Link>
                  <Link
                    href="/animations"
                    className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    ✨ Animations
                  </Link>
                  <Link
                    href="/tools"
                    className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    🔧 Tools
                  </Link>
                  <Button asChild variant="secondary" size="sm" className="bg-primary/10 text-primary hover:bg-primary/20">
                    <Link href="/contribute">
                      <span className="mr-2">+</span>
                      <span>Create</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main>{children}</main>

          {/* Customizer Panel (bottom-right corner) */}
          <CustomizerPanel />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
