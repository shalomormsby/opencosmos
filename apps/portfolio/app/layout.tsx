import type { Metadata } from 'next';
import { CustomizerPanel, ThemeProvider } from '@opencosmos/ui';
import { allFontVariables } from '../lib/fonts';
import GoogleAnalytics from './components/GoogleAnalytics';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shalom Ormsby | Product Design Leader',
  description: 'Human-centered design proven through experience',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={allFontVariables} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased" suppressHydrationWarning>
        <GoogleAnalytics />
        <ThemeProvider>
          {children}
          <CustomizerPanel />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
