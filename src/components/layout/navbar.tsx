'use client';

import { UserMenu } from '@/components/auth/user-menu';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

export function Navbar() {
  const { data: session } = useSession();
  return (
    <nav className='border-b bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo/Brand */}
          <div className='flex items-center'>
            <Link href='/' className='text-xl font-bold text-gray-900'>
              POS Next
            </Link>
          </div>
          {session && (
            <div className='hidden md:flex items-center space-x-4'>
              <Link
                href='/'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
              >
                Home
              </Link>
              <Link
                href='/dashboard'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
              >
                Dashboard
              </Link>
              <Link
                href='/products'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
              >
                Products
              </Link>
              <Link
                href='/categories'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
              >
                Categories
              </Link>
              <Link
                href='/inventory'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
              >
                Inventory
              </Link>
              <Link
                href='/users'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
              >
                Users
              </Link>
            </div>
          )}

          {/* User Menu */}
          <div className='flex items-center'>
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
