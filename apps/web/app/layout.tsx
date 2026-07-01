import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SoundFind — Identify Songs from Your Library',
    template: '%s | SoundFind',
  },
  description:
    'Record 5–8 seconds of any song and instantly identify it from your own music catalogue. Built with audio fingerprinting technology.',
  keywords: ['music recognition', 'song identification', 'audio fingerprinting', 'shazam'],
  authors: [{ name: 'SoundFind' }],
  themeColor: '#0a0a1a',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
