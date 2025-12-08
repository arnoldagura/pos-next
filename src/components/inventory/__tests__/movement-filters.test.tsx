import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MovementFilters } from '../movement-filters';
import type { MovementType } from '@/hooks/use-movements';

describe('MovementFilters', () => {
  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultFilters = {
    type: undefined,
    startDate: undefined,
    endDate: undefined,
  };

  it('should render all filter controls', () => {
    render(
      <MovementFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Movement Type')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('should display default "All Types" when no type filter is set', () => {
    render(
      <MovementFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('should render movement type selector', () => {
    render(
      <MovementFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
  });

  it('should render date input fields', () => {
    render(
      <MovementFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    expect(startDateInput).toBeInTheDocument();
    expect(endDateInput).toBeInTheDocument();
    expect(startDateInput).toHaveAttribute('type', 'date');
    expect(endDateInput).toHaveAttribute('type', 'date');
  });

  it('should display clear filters button when filters are active', () => {
    const activeFilters = {
      type: 'purchase' as MovementType,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    render(
      <MovementFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('should not display clear filters button when no filters are active', () => {
    render(
      <MovementFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
  });

  it('should clear all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    const activeFilters = {
      type: 'sale' as MovementType,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    render(
      <MovementFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      type: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('should show clear button when only type filter is active', () => {
    const filters = {
      type: 'transfer_in' as MovementType,
      startDate: undefined,
      endDate: undefined,
    };

    render(
      <MovementFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('should show clear button when only date filters are active', () => {
    const filters = {
      type: undefined,
      startDate: '2024-01-01',
      endDate: undefined,
    };

    render(
      <MovementFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('should display selected date filters', () => {
    const filters = {
      type: undefined,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    render(
      <MovementFilters
        filters={filters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;

    expect(startDateInput.value).toBe('2024-01-01');
    expect(endDateInput.value).toBe('2024-01-31');
  });
});
