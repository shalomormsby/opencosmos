import type { Metadata } from 'next'
import { ThemeProvider } from '@opencosmos/ui'
import { Analytics } from '@vercel/analytics/next'
import { CosmoSessionProvider } from './dialog/useCosmoSession'
import './globals.css'

export const metadata: Metadata = {
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
