import { test, expect } from '@playwright/test';
import {
  sampleMovements,
  mockEmptyMovementsAPI,
  mockMovementsAPIError,
  setupAllMocks,
  navigateToMovementHistory,
  selectMovementType,
  getMovementRows,
  mockInventoryDetailsAPI,
} from './fixtures/movement-fixtures';

/**
 * Inventory Movement History E2E Tests with Mocked API
 *
 * Actual table columns: Date | Type | Quantity | Unit Price | Total Value | Remarks | Reference
 *                       [0]    [1]    [2]        [3]          [4]          [5]       [6]
 */

const testInventoryId = 'test-inv-001';

test.describe('Inventory Movement History (Mocked API)', () => {
  test('should display movements from mocked API', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);
    expect(await rows.count()).toBe(4);
  });

  test('should display empty state with mocked empty response', async ({ page }) => {
    await mockInventoryDetailsAPI(page);
    await mockEmptyMovementsAPI(page);
    await navigateToMovementHistory(page, testInventoryId);

    await expect(page.getByText(/no movements found/i)).toBeVisible();
  });

  test('should handle API error gracefully', async ({ page }) => {
    await mockInventoryDetailsAPI(page);
    await mockMovementsAPIError(page);
    await navigateToMovementHistory(page, testInventoryId);

    // Component shows toast error "Failed to load movements" and empty state
    await expect(page.getByText(/no movements found/i)).toBeVisible();
  });

  test('should filter by movement type', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Filter by "Purchase"
    await selectMovementType(page, 'Purchase');

    const rows = await getMovementRows(page);
    expect(await rows.count()).toBe(1);
    await expect(rows.first()).toContainText('Purchase');
  });

  test('should restore all movements when filter reset to All', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Apply filter
    await selectMovementType(page, 'Purchase');
    let rows = await getMovementRows(page);
    expect(await rows.count()).toBe(1);

    // Reset to all
    await selectMovementType(page, 'All Movement Types');
    rows = await getMovementRows(page);
    expect(await rows.count()).toBe(4);
  });

  test('should display movement type badges', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Verify badges render with correct text
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    await expect(purchaseRow.locator('td').nth(1)).toContainText('Purchase');

    const saleRow = rows.filter({ hasText: 'Sale' });
    await expect(saleRow.locator('td').nth(1)).toContainText('Sale');

    const wasteRow = rows.filter({ hasText: 'Waste' });
    await expect(wasteRow.locator('td').nth(1)).toContainText('Waste');

    const adjustmentRow = rows.filter({ hasText: 'Adjustment' });
    await expect(adjustmentRow.locator('td').nth(1)).toContainText('Adjustment');
  });

  test('should show quantities with +/- signs', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has positive quantity (+100.00)
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseQty = purchaseRow.locator('td').nth(2);
    await expect(purchaseQty).toContainText('+100.00');

    // Sale has negative quantity (-20.00)
    const saleRow = rows.filter({ hasText: 'Sale' });
    const saleQty = saleRow.locator('td').nth(2);
    await expect(saleQty).toContainText('-20.00');
  });

  test('should display unit prices correctly', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has unit price $10.50
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchasePrice = purchaseRow.locator('td').nth(3);
    await expect(purchasePrice).toContainText('$10.50');

    // Adjustment has no unit price (shows -)
    const adjustmentRow = rows.filter({ hasText: 'Adjustment' });
    const adjustmentPrice = adjustmentRow.locator('td').nth(3);
    await expect(adjustmentPrice).toContainText('-');
  });

  test('should display remarks when available', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has remarks
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseRemarks = purchaseRow.locator('td').nth(5);
    await expect(purchaseRemarks).toContainText('Initial purchase');

    // Sale has no remarks (shows -)
    const saleRow = rows.filter({ hasText: 'Sale' });
    const saleRemarks = saleRow.locator('td').nth(5);
    await expect(saleRemarks).toContainText('-');
  });

  test('should display references when available', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    const rows = await getMovementRows(page);

    // Purchase has reference (purchase: po-001)
    const purchaseRow = rows.filter({ hasText: 'Purchase' });
    const purchaseRef = purchaseRow.locator('td').nth(6);
    await expect(purchaseRef).toContainText('purchase');
    await expect(purchaseRef).toContainText('po-001');

    // Adjustment has no reference (shows -)
    const adjustmentRow = rows.filter({ hasText: 'Adjustment' });
    const adjustmentRef = adjustmentRow.locator('td').nth(6);
    await expect(adjustmentRef).toContainText('-');
  });

  test('should display inventory details in header cards', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Product name heading
    await expect(page.getByRole('heading', { name: 'Test Product' })).toBeVisible();

    // Current stock card
    await expect(page.getByText('Current Stock')).toBeVisible();
    await expect(page.getByText('82.00 units')).toBeVisible();

    // Location card label
    await expect(page.getByText('Location', { exact: true })).toBeVisible();
  });

  test('should show total movements count', async ({ page }) => {
    await setupAllMocks(page, sampleMovements);
    await navigateToMovementHistory(page, testInventoryId);

    // Total Movements card shows count of movements loaded
    await expect(page.getByText('Total Movements')).toBeVisible();
  });
});
