import type { Metadata } from 'next'
import { ThemeProvider } from '@opencosmos/ui'
import { Analytics } from '@vercel/analytics/next'
import { CosmoSessionProvider } from './dialog/useCosmoSession'
import './globals.css'

export const metadata: Metadata = {
  // Without this, Next resolves opengraph-image to a relative URL and every
  // scraper — iMessage included — silently drops the card.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://opencosmos.ai')
  ),
  title: 'OpenCosmos',
  description: 'A creative platform built on the recognition that we are not separate from the universe we inhabit.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#000', colorScheme: 'dark' }}>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <CosmoSessionProvider>
            {children}
            <Analytics />
          </CosmoSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
