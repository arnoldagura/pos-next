import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * Creates a test user and stores authentication session
 */
async function globalSetup(config: FullConfig) {
  const baseURL = (config.use?.baseURL as string) || 'http://localhost:3000';

  // Launch a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test credentials
    const testEmail = 'e2e-test@example.com';
    const testPassword = 'Test@123456';
    const testName = 'E2E Test User';

    console.log('Setting up E2E test user...');

    // First, try to create user via API (more reliable than UI)
    try {
      const signUpResponse = await page.request.post(`${baseURL}/api/auth/sign-up`, {
        data: {
          name: testName,
          email: testEmail,
          password: testPassword,
        },
      });

      if (!signUpResponse.ok()) {
        console.log(`Sign up API failed (${signUpResponse.status()}), trying UI...`);
      } else {
        console.log('✓ Test user created via API');
      }
    } catch (error) {
      console.log('Sign up API not available, trying UI registration...');
    }

    // Try to log in via UI
    try {
      await page.goto(`${baseURL}/login`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Wait for form to be interactive
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });

      // Fill login form
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard or inventory page
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('✓ Successfully logged in and reached dashboard');
      } catch {
        // Try waiting for any navigation away from login
        await page.waitForURL((url) => !url.toString().includes('/login'), {
          timeout: 5000,
        });
        console.log('✓ Successfully logged in');
      }
    } catch (error) {
      console.warn('Login failed:', error instanceof Error ? error.message : String(error));
      console.log('Continuing with unauthenticated state...');
    }

    // Save auth state for tests
    await context.storageState({
      path: 'auth-state.json',
    });

    console.log('✓ E2E test authentication setup completed');
  } catch (error) {
    console.error('Global setup error:', error instanceof Error ? error.message : String(error));
    // Don't fail the entire test suite if setup fails
    // Tests will just fail with auth errors which is clearer
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
