'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/login"
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Sign in
        </a>
        <a
          href="/register"
          className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md"
        >
          Sign up
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium">{session.user.name}</p>
        <p className="text-xs text-gray-500">{session.user.email}</p>
      </div>
      <button
        onClick={handleSignOut}
        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
      >
        Sign out
      </button>
    </div>
  );
}
