import type { Metadata } from 'next';
import './globals.css';
import TopBar from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'GoVibe — plan the trip, pin the places, press play',
  description: 'AI-assisted trip planner with animated map playback, bookings upload and budget tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;700&family=Noto+Sans+Thai:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-page flex-1 px-5 pb-16 pt-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-page flex-wrap gap-5 px-5 py-6 text-xs text-muted">
            <span className="font-display font-bold text-ink">GoVibe</span>
            <span>Email + password · your trips are private (row-level security)</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
