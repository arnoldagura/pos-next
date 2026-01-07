'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentOrganizationId: string | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    isDefault: boolean;
  }>;
  isSuperAdmin: boolean;
}

/**
 * Custom hook to get extended session with tenant context
 * This wraps the base useSession and adds organization/super admin info
 */
export function useExtendedSession() {
  const { data: baseSession, isPending: isSessionPending } = useSession();

  const { data: extendedUser, isLoading: isExtendedLoading } = useQuery<ExtendedUser>({
    queryKey: ['session', 'extended', baseSession?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch extended session');
      return res.json();
    },
    enabled: !!baseSession?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: baseSession && extendedUser ? {
      ...baseSession,
      user: extendedUser,
    } : null,
    isPending: isSessionPending || isExtendedLoading,
    user: extendedUser,
  };
}
