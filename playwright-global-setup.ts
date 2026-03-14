import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Global setup for E2E tests
 * Logs in as the E2E test user and stores auth session.
 *
 * Prerequisites:
 *   1. Run `npx tsx src/db/seed-e2e-user.ts` to create the test user
 *   2. Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in .env
 */
async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'Test@123456';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`E2E auth setup: logging in as ${testEmail}...`);

    // Sign in via Better Auth API endpoint
    const signInResponse = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });

    if (signInResponse.ok()) {
      console.log('Signed in via API');
    } else {
      console.log(`API sign-in failed (${signInResponse.status()}), trying UI...`);

      // Fall back to UI login
      await page.goto(`${baseURL}/login`);
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      // Wait for redirect away from login
      await page.waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 15000,
      });
      console.log('Signed in via UI');
    }

    // Save auth state (cookies/session) for tests
    await context.storageState({ path: 'auth-state.json' });
    console.log('Auth state saved to auth-state.json');
  } catch (error) {
    console.error('E2E auth setup failed:', error instanceof Error ? error.message : String(error));
    console.log('Tests will run without authentication.');

    // Write empty state so tests don't crash looking for the file
    await context.storageState({ path: 'auth-state.json' });
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
