import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 24 hours
    },
  },
  // Development and production settings for subdomain support
  advanced: {
    // Disable CSRF check and use insecure cookies in development
    ...(process.env.NODE_ENV === 'development' && {
      disableCSRFCheck: true,
      useSecureCookies: false, // Must be false for http
    }),
    // Cookie settings for cross-subdomain support
    cookieOptions: {
      // Set domain to .local for development (requires hosts file setup)
      // Set domain to your production domain in production (e.g., .yourdomain.com)
      // Note: .localhost does NOT work for cookie sharing - use .local instead
      ...(process.env.NODE_ENV === 'development'
        ? { domain: '.local' } // Change to .local for subdomain cookie sharing
        : { domain: process.env.COOKIE_DOMAIN }), // Set COOKIE_DOMAIN=.yourdomain.com in production
      sameSite: 'lax',
      path: '/',
    },
  },
});
