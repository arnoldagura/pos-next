'use client';

import { useState } from 'react';
import { useSession, signOut } from '@/lib/auth-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, User, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    // Show overlay immediately — hides the dashboard before the network request
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  };

  if (signingOut) {
    return (
      <div className='fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='mt-3 text-sm text-muted-foreground font-medium'>Signing out…</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className='flex items-center gap-2 p-2'>
        <Skeleton className='h-8 w-8 rounded-full' />
        <div className='hidden md:flex flex-col gap-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-3 w-32' />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/login'>Sign in</Link>
        </Button>
        <Button size='sm' asChild>
          <Link href='/register'>Sign up</Link>
        </Button>
      </div>
    );
  }

  const userInitials = session.user.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : session.user.email?.[0]?.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='flex items-center gap-2 h-auto p-2'>
          <Avatar className='h-8 w-8'>
            <AvatarFallback className='bg-primary text-primary-foreground text-sm'>
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className='hidden md:block text-left'>
            <p className='text-sm font-medium leading-none'>{session.user.name}</p>
            <p className='text-xs text-muted-foreground mt-1'>{session.user.email}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium'>{session.user.name}</p>
            <p className='text-xs text-muted-foreground'>{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href='/profile' className='cursor-pointer'>
            <User className='mr-2 h-4 w-4' />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/settings' className='cursor-pointer'>
            <Settings className='mr-2 h-4 w-4' />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className='cursor-pointer'>
          <LogOut className='mr-2 h-4 w-4' />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
