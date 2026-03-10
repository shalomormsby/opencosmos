import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenCosmos',
  description: 'A creative platform built on the recognition that we are not separate from the universe we inhabit.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
