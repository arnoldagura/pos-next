import { test, expect } from '@playwright/test';
import {
  sampleMovements,
  mockMovementsAPI,
  mockEmptyMovementsAPI,
  mockMovementsAPIError,
  navigateToMovementHistory,
  selectMovementType,
  setDateRange,
  clearFilters,
  getMovementRows,
} from './fixtures/movement-fixtures';

/**
 * Inventory Movement History E2E Tests with Mocked API
 * These tests use mocked API responses for predictable testing
 */

test.describe('Inventory Movement History (Mocked API)', () => {
  const testInventoryId = 'test-inv-001';

  test('should display movements from mocked API', async ({ page }) => {
    // Mock the API with sample data
    await mockMovementsAPI(page, sampleMovements);

    // Navigate to page
    await navigateToMovementHistory(page, testInventoryId);

    // Wait for table to load
    const rows = await getMovementRows(page);
    const count = await rows.count();

    // Should have 4 movements from sample data
    expect(count).toBe(4);

    // Verify first movement (newest) is displayed
    const firstRow = rows.first();
    await expect(firstRow).toContainText('Waste'); // Latest movement in sample data
  });

  test('should correctly filter by movement type', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Filter by "Purchase"
    await selectMovementType(page, 'Purchase');

    // Should only show purchase movements (1 in sample data)
    const rows = await getMovementRows(page);
    const count = await rows.count();
    expect(count).toBe(1);

    // Verify it's a purchase
    await expect(rows.first()).toContainText('Purchase');
  });

  test('should correctly filter by date range', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Set date range to only include Jan 15-16 (should get 2 movements)
    await setDateRange(page, '2024-01-15', '2024-01-16');

    const rows = await getMovementRows(page);
    const count = await rows.count();

    // Should have 2 movements (purchase and sale)
    expect(count).toBe(2);
  });

  test('should display correct running balance', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Calculate expected balances
    // const expectedBalances = calculateRunningBalance(sampleMovements);

    // Wait for table
    const rows = await getMovementRows(page);

    // Check first row's running balance (should be last calculated balance)
    const firstRowBalance = await rows
      .first()
      .locator('td')
      .nth(4)
      .textContent();

    // Running balance should match expected (82.00: 100 - 20 + 5 - 3)
    expect(firstRowBalance?.trim()).toBe('82.00');
  });

  test('should display empty state with mocked empty response', async ({
    page,
  }) => {
    await mockEmptyMovementsAPI(page);
    await navigateToMovementHistory(page, testInventoryId);

    // Should show empty state
    await expect(page.getByText(/no movements found/i)).toBeVisible();

    // Table should not have any rows
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBe(0);
  });

  test('should handle API error gracefully', async ({ page }) => {
    await mockMovementsAPIError(page);
    await navigateToMovementHistory(page, testInventoryId);

    // Should show error message
    await expect(
      page.getByText(/error loading movement history/i)
    ).toBeVisible();
  });

  test('should display movement type badges with correct colors', async ({
    page,
  }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Wait for table
    const rows = await getMovementRows(page);

    // Check purchase badge (green) - Badge is in the Type column (2nd column, index 1)
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseBadge = purchaseRow
      .locator('td')
      .nth(1)
      .locator('span[data-slot="badge"]')
      .first();
    await expect(purchaseBadge).toHaveClass(/text-green-600/);

    // Check sale badge (blue)
    const saleRow = rows.filter({ hasText: 'Sale' });
    const saleBadge = saleRow
      .locator('td')
      .nth(1)
      .locator('span[data-slot="badge"]')
      .first();
    await expect(saleBadge).toHaveClass(/text-blue-600/);

    // Check waste badge (red)
    const wasteRow = rows.filter({ hasText: 'Waste' });
    const wasteBadge = wasteRow
      .locator('td')
      .nth(1)
      .locator('span[data-slot="badge"]')
      .first();
    await expect(wasteBadge).toHaveClass(/text-red-600/);
  });

  test('should show quantities with +/- signs correctly', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase should have + sign (green)
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseQty = purchaseRow.locator('td').nth(2);
    await expect(purchaseQty).toContainText('+100.00');
    await expect(purchaseQty.locator('span')).toHaveClass(/text-green-600/);

    // Sale should have - sign (red)
    const saleRow = rows.filter({ hasText: 'Sale' });
    const saleQty = saleRow.locator('td').nth(2);
    await expect(saleQty).toContainText('-20.00');
    await expect(saleQty.locator('span')).toHaveClass(/text-red-600/);
  });

  test('should display unit prices correctly', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has unit price
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchasePrice = purchaseRow.locator('td').nth(3);
    await expect(purchasePrice).toContainText('$10.50');

    // Adjustment has no unit price (should show -)
    const adjustmentRow = rows.filter({ hasText: 'Adjustment' });
    const adjustmentPrice = adjustmentRow.locator('td').nth(3);
    await expect(adjustmentPrice).toContainText('-');
  });

  test('should display reference links when available', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has reference link
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseRef = purchaseRow.locator('td').nth(5);
    const link = purchaseRef.locator('a');
    await expect(link).toBeVisible();
    await expect(link).toContainText('purchase - po-001');

    // Adjustment has no reference
    const adjustmentRow = rows.filter({ hasText: 'Adjustment' });
    const adjustmentRef = adjustmentRow.locator('td').nth(5);
    await expect(adjustmentRef).toContainText('-');
  });

  test('should display user information', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase created by admin
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseUser = purchaseRow.locator('td').nth(6);
    await expect(purchaseUser).toContainText('admin');

    // Sale created by cashier
    const saleRow = rows.filter({ hasText: 'Sale' });
    const saleUser = saleRow.locator('td').nth(6);
    await expect(saleUser).toContainText('cashier');
  });

  test('should display remarks when available', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has remarks
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseRemarks = purchaseRow.locator('td').nth(7);
    await expect(purchaseRemarks).toContainText('Initial purchase');

    // Sale has no remarks
    const saleRow = rows.filter({ hasText: 'Sale' });
    const saleRemarks = saleRow.locator('td').nth(7);
    await expect(saleRemarks).toContainText('-');
  });

  test('should clear filters and restore all movements', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Apply filter
    await selectMovementType(page, 'Purchase');

    // Should have 1 movement
    let rows = await getMovementRows(page);
    expect(await rows.count()).toBe(1);

    // Clear filters
    await clearFilters(page);

    // Should have all 4 movements again
    rows = await getMovementRows(page);
    expect(await rows.count()).toBe(4);
  });

  test('should combine type and date filters', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Filter by Purchase type AND date range Jan 15-15
    await selectMovementType(page, 'Purchase');
    await setDateRange(page, '2024-01-15', '2024-01-15');

    // Should have exactly 1 movement (the purchase on Jan 15)
    const rows = await getMovementRows(page);
    expect(await rows.count()).toBe(1);
    await expect(rows.first()).toContainText('Purchase');
    await expect(rows.first()).toContainText('Initial purchase');
  });

  test('should show movement count in card description', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Should show total count
    await expect(page.getByText(/4.*total movements/i)).toBeVisible();
  });

  test('should handle filter with no results', async ({ page }) => {
    await mockMovementsAPI(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Filter by date range with no movements
    await setDateRange(page, '2024-01-01', '2024-01-10');

    // Should show empty state
    await expect(page.getByText(/no movements found/i)).toBeVisible();
  });
});
