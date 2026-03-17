'use client';

import { Loader2 } from 'lucide-react';
import { useSidebar } from '@/contexts/sidebar-context';
import { useExtendedSession } from '@/hooks/use-extended-session';
import { cn } from '@/lib/utils';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  // Use the same session hook as the sidebar so the margin and sidebar
  // always appear/disappear at exactly the same time — no gap flash.
  const { data: session, isPending } = useExtendedSession();

  // While the session is still resolving after a login/page-load, show a
  // full-screen loader so neither the dashboard nor the sidebar layout
  // flashes in piecemeal.
  if (isPending) {
    return (
      <div className='fixed inset-0 z-[200] flex items-center justify-center bg-background'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  const authenticated = !!session;

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-300',
        authenticated && 'pt-16 lg:pt-0 bg-muted/30',
        authenticated && (collapsed ? 'lg:ml-16' : 'lg:ml-64')
      )}
    >
      {authenticated ? (
        <div className='container mx-auto p-6 page-enter'>{children}</div>
      ) : (
        children
      )}
    </main>
  );
}
