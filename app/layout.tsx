import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import HydrationProvider from '@/components/HydrationProvider';
import SaveErrorBanner from '@/components/SaveErrorBanner';

export const metadata: Metadata = {
  title: 'Investment Portfolio Dashboard',
  description: 'Track your Indian stock market investments — built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f1117] text-slate-200 min-h-screen">
        <HydrationProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-56px)]">
            {children}
          </main>
          <SaveErrorBanner />
        </HydrationProvider>
      </body>
    </html>
  );
}
