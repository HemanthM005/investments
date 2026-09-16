'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import HydrationProvider from './HydrationProvider';
import SaveErrorBanner from './SaveErrorBanner';

// Routes rendered without the app chrome. /login must not mount
// HydrationProvider — every request would 401 behind the password gate.
const BARE_ROUTES = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <HydrationProvider>
      <Navbar />
      {/* lg:pl-60 clears the permanent sidebar; below lg the sidebar is a drawer */}
      <main className="min-h-[calc(100vh-3rem-env(safe-area-inset-top))] lg:min-h-screen lg:pl-60">
        {children}
      </main>
      <SaveErrorBanner />
    </HydrationProvider>
  );
}
