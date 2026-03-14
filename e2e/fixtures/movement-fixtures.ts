import { Page } from '@playwright/test';

/**
 * Test fixtures and utilities for inventory movement e2e tests
 */

export interface TestMovement {
  id: string;
  productInventoryId: string;
  type:
    | 'purchase'
    | 'sale'
    | 'adjustment'
    | 'waste'
    | 'transfer_in'
    | 'transfer_out'
    | 'production_output'
    | 'receive_from_material';
  quantity: string;
  unitPrice: string | null;
  date: string;
  remarks: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
}

/**
 * Sample test data for movements (quantity sign indicates direction)
 */
export const sampleMovements: TestMovement[] = [
  {
    id: 'mov-test-001',
    productInventoryId: 'test-inv-001',
    type: 'purchase',
    quantity: '100',
    unitPrice: '10.50',
    date: '2024-01-15T00:00:00.000Z',
    remarks: 'Initial purchase',
    referenceType: 'purchase',
    referenceId: 'po-001',
    createdBy: 'admin',
  },
  {
    id: 'mov-test-002',
    productInventoryId: 'test-inv-001',
    type: 'sale',
    quantity: '-20',
    unitPrice: '15.00',
    date: '2024-01-16T00:00:00.000Z',
    remarks: null,
    referenceType: 'order',
    referenceId: 'ord-001',
    createdBy: 'cashier',
  },
  {
    id: 'mov-test-003',
    productInventoryId: 'test-inv-001',
    type: 'adjustment',
    quantity: '5',
    unitPrice: null,
    date: '2024-01-17T00:00:00.000Z',
    remarks: 'Stock correction',
    referenceType: null,
    referenceId: null,
    createdBy: 'admin',
  },
  {
    id: 'mov-test-004',
    productInventoryId: 'test-inv-001',
    type: 'waste',
    quantity: '-3',
    unitPrice: null,
    date: '2024-01-18T00:00:00.000Z',
    remarks: 'Damaged items',
    referenceType: null,
    referenceId: null,
    createdBy: 'manager',
  },
];

/**
 * Mock inventory details API (for the inventory info cards)
 */
export async function mockInventoryDetailsAPI(page: Page) {
  await page.route('**/api/product-inventories/test-inv-001', async (route) => {
    if (route.request().url().includes('/movements')) {
      return route.fallback();
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-inv-001',
        productName: 'Test Product',
        productSku: 'TST-001',
        locationName: 'Main Store',
        currentStock: 82,
        unitOfMeasure: 'units',
      }),
    });
  });
}

/**
 * Mock movements API — matches /api/product-inventories/[id]/movements
 */
export async function mockMovementsAPI(page: Page, movements: TestMovement[]) {
  await page.route('**/api/product-inventories/*/movements*', async (route) => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get('type');

    let filteredMovements = movements;

    if (type) {
      filteredMovements = filteredMovements.filter((m) => m.type === type);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: filteredMovements,
        pagination: {
          page: 1,
          limit: 50,
          total: filteredMovements.length,
          totalPages: 1,
        },
      }),
    });
  });
}

/**
 * Mock empty movements response
 */
export async function mockEmptyMovementsAPI(page: Page) {
  await page.route('**/api/product-inventories/*/movements*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      }),
    });
  });
}

/**
 * Mock API error for movements
 */
export async function mockMovementsAPIError(page: Page) {
  // Mock both endpoints to return errors
  await page.route('**/api/product-inventories/*/movements*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });
}

/**
 * Helper to set up all mocks needed for the movements page
 */
export async function setupAllMocks(page: Page, movements: TestMovement[]) {
  await mockInventoryDetailsAPI(page);
  await mockMovementsAPI(page, movements);
}

/**
 * Helper to navigate to movement history page
 */
export async function navigateToMovementHistory(page: Page, inventoryId: string) {
  await page.goto(`/product-inventories/${inventoryId}/movements`);
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to select movement type filter via the Select component
 */
export async function selectMovementType(page: Page, type: string) {
  const trigger = page.getByRole('combobox');
  await trigger.click();
  await page.waitForTimeout(500);

  const option = page.getByRole('option', { name: type });
  await option.waitFor({ state: 'visible', timeout: 5000 });

  try {
    await option.click({ timeout: 2000 });
  } catch {
    await option.click({ force: true });
  }

  await page.waitForTimeout(1000);
}

/**
 * Helper to get movement table rows
 */
export async function getMovementRows(page: Page) {
  await page.waitForSelector('table', { timeout: 10000 });
  return page.locator('tbody tr');
}
