'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={cn(
        'pt-16 lg:pt-0 min-h-screen transition-all duration-300',
        'ml-0',
        collapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}
    >
      <div className='container mx-auto p-6'>{children}</div>
    </main>
  );
}
