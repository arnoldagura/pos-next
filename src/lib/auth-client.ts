import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // Use the current origin (subdomain-aware) or fallback to localhost
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // useActiveOrganization,
} = authClient;
