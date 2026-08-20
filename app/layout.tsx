import type { Metadata } from 'next';

import './globals.css';
import '@/features/storefront/styles/storefront.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rental.local'),
  title: 'Independent stays',
  description: 'Short-term accommodation booked directly with the host.',
  applicationName: 'Independent stays',
  manifest: '/manifest.webmanifest',
  formatDetection: { email: false, address: false, telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><link href="/favicon.svg" rel="icon" /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
