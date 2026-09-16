import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Investment Portfolio Dashboard',
  description: 'Track your Indian stock market investments — built with Next.js',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let content sit under the notch/status bar in the Capacitor shell
  viewportFit: 'cover',
  themeColor: '#0f1117',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f1117] text-slate-200 min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
