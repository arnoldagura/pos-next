import { Page } from '@playwright/test';

/**
 * Test fixtures and utilities for inventory movement e2e tests
 */

export interface TestInventory {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
}

export interface TestMovement {
  id: string;
  inventoryId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'waste' | 'transfer_in' | 'transfer_out' | 'production_output' | 'receive_from_material';
  quantity: string;
  unitPrice: string | null;
  date: Date;
  remarks: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
}

/**
 * Sample test data for movements
 */
export const sampleMovements: TestMovement[] = [
  {
    id: 'mov-test-001',
    inventoryId: 'test-inv-001',
    type: 'purchase',
    quantity: '100',
    unitPrice: '10.50',
    date: new Date('2024-01-15'),
    remarks: 'Initial purchase',
    referenceType: 'purchase',
    referenceId: 'po-001',
    createdBy: 'admin',
  },
  {
    id: 'mov-test-002',
    inventoryId: 'test-inv-001',
    type: 'sale',
    quantity: '20',
    unitPrice: '15.00',
    date: new Date('2024-01-16'),
    remarks: null,
    referenceType: 'order',
    referenceId: 'ord-001',
    createdBy: 'cashier',
  },
  {
    id: 'mov-test-003',
    inventoryId: 'test-inv-001',
    type: 'adjustment',
    quantity: '5',
    unitPrice: null,
    date: new Date('2024-01-17'),
    remarks: 'Stock correction',
    referenceType: null,
    referenceId: null,
    createdBy: 'admin',
  },
  {
    id: 'mov-test-004',
    inventoryId: 'test-inv-001',
    type: 'waste',
    quantity: '3',
    unitPrice: null,
    date: new Date('2024-01-18'),
    remarks: 'Damaged items',
    referenceType: null,
    referenceId: null,
    createdBy: 'manager',
  },
];

/**
 * Mock API responses for testing
 */
export async function mockMovementsAPI(page: Page, movements: TestMovement[]) {
  await page.route('**/api/inventory/movements*', async (route) => {
    const url = new URL(route.request().url());
    const inventoryId = url.searchParams.get('inventoryId');
    const type = url.searchParams.get('type');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let filteredMovements = movements;

    // Filter by inventoryId
    if (inventoryId) {
      filteredMovements = filteredMovements.filter(m => m.inventoryId === inventoryId);
    }

    // Filter by type
    if (type) {
      filteredMovements = filteredMovements.filter(m => m.type === type);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filteredMovements = filteredMovements.filter(m => new Date(m.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredMovements = filteredMovements.filter(m => new Date(m.date) <= end);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: filteredMovements,
        total: filteredMovements.length,
        page: 1,
        limit: 100,
        totalPages: 1,
      }),
    });
  });
}

/**
 * Mock empty movements response
 */
export async function mockEmptyMovementsAPI(page: Page) {
  await page.route('**/api/inventory/movements*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      }),
    });
  });
}

/**
 * Mock API error
 */
export async function mockMovementsAPIError(page: Page) {
  await page.route('**/api/inventory/movements*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    });
  });
}

/**
 * Helper to navigate to movement history page
 */
export async function navigateToMovementHistory(page: Page, inventoryId: string) {
  await page.goto(`/inventory/${inventoryId}/movements`);
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to select movement type filter
 */
export async function selectMovementType(page: Page, type: string) {
  // Click the combobox trigger
  const trigger = page.getByRole('combobox');
  await trigger.click();

  // Wait for the dropdown to be visible
  await page.waitForTimeout(500);

  // Find and click the option - use force click if needed for Radix UI
  const option = page.getByRole('option', { name: type });
  await option.waitFor({ state: 'visible', timeout: 5000 });

  // Try regular click first
  try {
    await option.click({ timeout: 2000 });
  } catch {
    // If regular click fails, try force click (bypasses visibility checks)
    await option.click({ force: true });
  }

  // Wait for filter to apply
  await page.waitForTimeout(1000);
}

/**
 * Helper to set date range filter
 */
export async function setDateRange(page: Page, startDate: string, endDate: string) {
  await page.locator('#start-date').fill(startDate);
  await page.locator('#end-date').fill(endDate);
  await page.waitForTimeout(1000);
}

/**
 * Helper to clear all filters
 */
export async function clearFilters(page: Page) {
  const clearButton = page.getByRole('button', { name: /clear filters/i });
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Helper to get movement table rows
 */
export async function getMovementRows(page: Page) {
  await page.waitForSelector('table', { timeout: 10000 });
  return page.locator('tbody tr');
}

/**
 * Helper to verify movement badge color
 */
export function getExpectedBadgeClass(type: TestMovement['type']): string {
  const colorMap: Record<TestMovement['type'], string> = {
    purchase: 'text-green-600',
    sale: 'text-blue-600',
    adjustment: 'text-purple-600',
    waste: 'text-red-600',
    transfer_in: 'text-cyan-600',
    transfer_out: 'text-orange-600',
    production_output: 'text-indigo-600',
    receive_from_material: 'text-teal-600',
  };
  return colorMap[type];
}

/**
 * Helper to calculate expected running balance
 */
export function calculateRunningBalance(movements: TestMovement[]): number[] {
  let balance = 0;
  const balances: number[] = [];

  // Sort by date (oldest first)
  const sorted = [...movements].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const movement of sorted) {
    const quantity = parseFloat(movement.quantity);
    const increaseTypes = ['purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment'];

    if (increaseTypes.includes(movement.type)) {
      balance += quantity;
    } else {
      balance -= quantity;
    }

    balances.push(balance);
  }

  // Return in reverse order (newest first, matching display)
  return balances.reverse();
}

/**
 * Format date for input fields
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date X days ago
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}
