'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { useSession } from '@/lib/auth-client';
import { Menu, Store } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MobileHeader() {
  const { data: session } = useSession();
  const { toggleMobile } = useSidebar();

  if (!session) {
    return null;
  }

  return (
    <header className='fixed top-0 left-0 right-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 lg:hidden'>
      <div className='flex items-center justify-between h-full px-4'>
        <Button variant='ghost' size='sm' onClick={toggleMobile}>
          <Menu className='h-5 w-5' />
        </Button>
        <Link href='/' className='flex items-center gap-2 text-xl font-bold'>
          <div className='w-7 h-7 rounded-lg bg-primary flex items-center justify-center'>
            <Store className='h-4 w-4 text-primary-foreground' />
          </div>
          POS Next
        </Link>
        <div className='w-10' /> {/* Spacer for centering */}
      </div>
    </header>
  );
}
