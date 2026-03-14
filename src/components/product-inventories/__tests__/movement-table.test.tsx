import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovementTable } from '../movement-table';
import type { Movement } from '@/hooks/use-movements';
import * as XLSX from 'xlsx';

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock window.print
global.print = vi.fn();

describe('MovementTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMovements: Movement[] = [
    {
      id: 'mov-1',
      inventoryId: 'inv-123',
      type: 'purchase',
      quantity: '100',
      unitPrice: '10.50',
      date: new Date('2024-01-15T10:00:00Z'),
      remarks: 'Initial purchase',
      referenceType: 'purchase',
      referenceId: 'po-001',
      createdBy: 'John Doe',
      createdAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'mov-2',
      inventoryId: 'inv-123',
      type: 'sale',
      quantity: '20',
      unitPrice: '15.00',
      date: new Date('2024-01-16T14:30:00Z'),
      remarks: null,
      referenceType: 'order',
      referenceId: 'ord-001',
      createdBy: 'Jane Smith',
      createdAt: new Date('2024-01-16T14:30:00Z'),
    },
    {
      id: 'mov-3',
      inventoryId: 'inv-123',
      type: 'adjustment',
      quantity: '5',
      unitPrice: null,
      date: new Date('2024-01-17T09:15:00Z'),
      remarks: 'Stock correction',
      referenceType: null,
      referenceId: null,
      createdBy: null,
      createdAt: new Date('2024-01-17T09:15:00Z'),
    },
  ];

  it('should render empty state when no movements provided', () => {
    render(<MovementTable movements={[]} />);
    expect(screen.getByText('No movements found')).toBeInTheDocument();
  });

  it('should render movement table with all columns', () => {
    render(<MovementTable movements={mockMovements} />);

    // Check headers
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Unit Price')).toBeInTheDocument();
    expect(screen.getByText('Running Balance')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Remarks')).toBeInTheDocument();
  });

  it('should display movement data correctly', () => {
    render(<MovementTable movements={mockMovements} />);

    // Check movement types
    expect(screen.getByText('Purchase')).toBeInTheDocument();
    expect(screen.getByText('Sale')).toBeInTheDocument();
    expect(screen.getByText('Adjustment')).toBeInTheDocument();

    // Check quantities (displayed with +/- signs)
    expect(screen.getByText(/\+100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/-20\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\+5\.00/)).toBeInTheDocument();

    // Check users
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument(); // null user shows as "System"

    // Check remarks
    expect(screen.getByText('Initial purchase')).toBeInTheDocument();
    expect(screen.getByText('Stock correction')).toBeInTheDocument();
  });

  it('should calculate running balance correctly', () => {
    render(<MovementTable movements={mockMovements} />);

    // Movements are sorted oldest first for calculation, newest first for display
    // mov-1: +100 = 100
    // mov-2: -20 = 80
    // mov-3: +5 = 85
    // Displayed newest first: 85.00, 80.00, 100.00

    // const balances = screen.getAllByText(/\d+\.\d{2}/);
    // Note: This includes quantities and balances, so we check for specific running balances
    expect(screen.getByText('85.00')).toBeInTheDocument(); // Latest balance
    expect(screen.getByText('80.00')).toBeInTheDocument(); // Second movement
    expect(screen.getByText('100.00')).toBeInTheDocument(); // First movement
  });

  it('should display unit prices correctly or show dash for null', () => {
    render(<MovementTable movements={mockMovements} />);

    expect(screen.getByText('$10.50')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    // The third movement has null unitPrice, should show "-"
    const cells = screen.getAllByText('-');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should render clickable reference links when reference exists', () => {
    render(<MovementTable movements={mockMovements} />);

    const purchaseLink = screen.getByText('purchase - po-001');
    expect(purchaseLink).toBeInTheDocument();
    expect(purchaseLink.closest('a')).toHaveAttribute('href', '/dashboard/purchases/po-001');

    const orderLink = screen.getByText('order - ord-001');
    expect(orderLink).toBeInTheDocument();
    expect(orderLink.closest('a')).toHaveAttribute('href', '/dashboard/orders/ord-001');
  });

  it('should show dash when no reference exists', () => {
    render(<MovementTable movements={mockMovements} />);

    // Third movement has no reference
    const cells = screen.getAllByText('-');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should export to Excel when export button clicked', () => {
    render(<MovementTable movements={mockMovements} />);

    const exportButton = screen.getByText('Export to Excel');
    fireEvent.click(exportButton);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('should call window.print when print button clicked', () => {
    render(<MovementTable movements={mockMovements} />);

    const printButton = screen.getByText('Print Report');
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalled();
  });

  it('should display movement type badges with correct colors', () => {
    render(<MovementTable movements={mockMovements} />);

    const purchaseBadge = screen.getByText('Purchase');
    expect(purchaseBadge).toHaveClass('text-green-600', 'bg-green-50');

    const saleBadge = screen.getByText('Sale');
    expect(saleBadge).toHaveClass('text-blue-600', 'bg-blue-50');

    const adjustmentBadge = screen.getByText('Adjustment');
    expect(adjustmentBadge).toHaveClass('text-purple-600', 'bg-purple-50');
  });

  it('should show quantities with correct color coding', () => {
    render(<MovementTable movements={mockMovements} />);

    // Purchase (+) should be green
    const purchaseQty = screen.getByText(/\+100\.00/);
    expect(purchaseQty).toHaveClass('text-green-600');

    // Sale (-) should be red
    const saleQty = screen.getByText(/-20\.00/);
    expect(saleQty).toHaveClass('text-red-600');

    // Adjustment (+) should be green
    const adjustmentQty = screen.getByText(/\+5\.00/);
    expect(adjustmentQty).toHaveClass('text-green-600');
  });

  it('should handle movements with waste type correctly', () => {
    const wasteMovement: Movement = {
      id: 'mov-4',
      inventoryId: 'inv-123',
      type: 'waste',
      quantity: '3',
      unitPrice: null,
      date: new Date('2024-01-18T10:00:00Z'),
      remarks: 'Damaged items',
      referenceType: null,
      referenceId: null,
      createdBy: 'admin',
      createdAt: new Date('2024-01-18T10:00:00Z'),
    };

    render(<MovementTable movements={[wasteMovement]} />);

    // Check that waste badge is rendered
    expect(screen.getByText('Waste')).toBeInTheDocument();

    // Check that quantity is displayed with negative sign (there will be multiple -3.00 including running balance)
    const negativeQuantities = screen.getAllByText(/-3\.00/);
    expect(negativeQuantities.length).toBeGreaterThan(0);

    // Check that damaged items remark is shown
    expect(screen.getByText('Damaged items')).toBeInTheDocument();
  });

  it('should handle transfer movements correctly', () => {
    const transferMovements: Movement[] = [
      {
        id: 'mov-5',
        inventoryId: 'inv-123',
        type: 'transfer_in',
        quantity: '50',
        unitPrice: null,
        date: new Date('2024-01-19T10:00:00Z'),
        remarks: 'Transfer from warehouse A',
        referenceType: 'transfer',
        referenceId: 'tr-001',
        createdBy: 'admin',
        createdAt: new Date('2024-01-19T10:00:00Z'),
      },
      {
        id: 'mov-6',
        inventoryId: 'inv-123',
        type: 'transfer_out',
        quantity: '25',
        unitPrice: null,
        date: new Date('2024-01-20T10:00:00Z'),
        remarks: 'Transfer to warehouse B',
        referenceType: 'transfer',
        referenceId: 'tr-002',
        createdBy: 'admin',
        createdAt: new Date('2024-01-20T10:00:00Z'),
      },
    ];

    render(<MovementTable movements={transferMovements} />);

    expect(screen.getByText('Transfer In')).toBeInTheDocument();
    expect(screen.getByText('Transfer Out')).toBeInTheDocument();
    expect(screen.getByText(/\+50\.00/)).toBeInTheDocument();
    expect(screen.getByText(/-25\.00/)).toBeInTheDocument();
  });
});
