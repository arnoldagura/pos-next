import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the page title', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Create Next App/);
  });

  test('should have Zustand example section', async ({ page }) => {
    await page.goto('/');

    // Check for Zustand section
    const zustanSection = page.getByText('Zustand Example');
    await expect(zustanSection).toBeVisible();

    // Check for bear counter
    const bearCounter = page.getByText(/bears around here/);
    await expect(bearCounter).toBeVisible();
  });

  test('should increment bear count when button is clicked', async ({
    page,
  }) => {
    await page.goto('/');

    // Get initial count
    const bearCounter = page.getByText(/\d+ bears around here/);
    await expect(bearCounter).toBeVisible();

    // Click the add bear button
    const addButton = page.getByRole('button', { name: /add bear/i });
    await addButton.click();

    // Verify count increased
    await expect(page.getByText(/1 bears around here/)).toBeVisible();
  });

  test('should have React Hook Form section', async ({ page }) => {
    await page.goto('/');

    // Check for form section
    const formSection = page.getByText('React Hook Form + Zod Validation');
    await expect(formSection).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create user/i });
    await submitButton.click();

    // Check for validation errors
    await expect(
      page.getByText(/name must be at least 2 characters/i)
    ).toBeVisible();
  });

  test('should submit form with valid data', async ({ page }) => {
    await page.goto('/');

    // Fill out the form
    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('john@example.com').fill('test@example.com');
    await page.getByPlaceholder('25').fill('30');

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create user/i });
    await submitButton.click();

    // Wait for the form to reset (indicates success)
    await expect(page.getByPlaceholder('John Doe')).toHaveValue('');
  });

  test('should display users list', async ({ page }) => {
    await page.goto('/');

    // Check for users section
    const usersSection = page.getByText('TanStack Query Example');
    await expect(usersSection).toBeVisible();

    // Wait for users to load
    await expect(page.getByText('Users:')).toBeVisible();
  });
});
