import { auth } from './auth';
import { headers } from 'next/headers';
import { cache } from 'react';

/**
 * Get the current session (server-side only)
 * Cached per request to avoid multiple database calls
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
});

/**
 * Require authentication - throws if not authenticated
 * Use in server components and route handlers
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Get current user (server-side only)
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}
