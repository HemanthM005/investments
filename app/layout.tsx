import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import HydrationProvider from '@/components/HydrationProvider';
import SaveErrorBanner from '@/components/SaveErrorBanner';
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
        <HydrationProvider>
          <ThemeProvider>
            <Navbar />
            {/* lg:pl-60 clears the permanent sidebar; below lg the sidebar is a drawer */}
            <main className="min-h-[calc(100vh-3rem-env(safe-area-inset-top))] lg:min-h-screen lg:pl-60">
              {children}
            </main>
            <SaveErrorBanner />
          </ThemeProvider>
        </HydrationProvider>
      </body>
    </html>
  );
}
