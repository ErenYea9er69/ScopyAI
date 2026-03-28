import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: {
    default: 'ScopyAI — AI Market Intelligence Engine',
    template: '%s | ScopyAI',
  },
  description: 'Enter a niche. Get a complete, sourced, confidence-scored intelligence report in 4 minutes. Live web research, 8-layer analysis, and auto-pivot suggestions.',
  metadataBase: new URL('https://scopyai.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ScopyAI',
    title: 'ScopyAI — AI Market Intelligence Engine',
    description: 'Enter a niche. Get a complete, sourced, confidence-scored intelligence report in 4 minutes.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ScopyAI Intelligence Engine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScopyAI — AI Market Intelligence Engine',
    description: 'Enter a niche. Get a complete, sourced, confidence-scored intelligence report in 4 minutes.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable}`}>
      <body className="bg-bg text-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
