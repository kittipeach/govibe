import type { Metadata } from 'next';
import './globals.css';
import TopBar from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'GoVibe — plan trips, pin places, play the route',
  description: 'AI-assisted trip planner with animated map playback, bookings upload and budget tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+Thai:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TopBar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
