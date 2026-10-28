'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import HydrationProvider from './HydrationProvider';
import SaveErrorBanner from './SaveErrorBanner';
import { useAppStore } from '@/lib/appStore';
import { cn } from '@/lib/utils';

// Routes rendered without the app chrome. /login must not mount
// HydrationProvider — every request would 401 behind the password gate.
const BARE_ROUTES = ['/login', '/register'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarMode, sidebarExpanded } = useAppStore((s) => s.settings);
  // Hover mode expands over the content, so only a pinned/expanded sidebar pushes it
  const wide = sidebarMode === 'pinned' || (sidebarMode === 'click' && sidebarExpanded);

  if (BARE_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <HydrationProvider>
      <Navbar />
      {/* lg padding clears the permanent sidebar (w-60 expanded, w-16 icon rail); below lg the sidebar is a drawer */}
      <main className={cn(
        'min-h-[calc(100vh-3rem-env(safe-area-inset-top))] transition-[padding] duration-200 lg:min-h-screen',
        wide ? 'lg:pl-60' : 'lg:pl-16',
      )}>
        {children}
      </main>
      <SaveErrorBanner />
    </HydrationProvider>
  );
}
