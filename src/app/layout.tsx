import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable}`}>
      <body className="bg-bg text-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: 'ScopyAI — AI Market Intelligence Engine',
  description: 'Enter a niche. Get a complete, sourced, confidence-scored intelligence report in 4 minutes.',
};
