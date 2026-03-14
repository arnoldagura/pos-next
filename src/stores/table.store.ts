import { create } from 'zustand';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface Table {
  id: string;
  number: string;
  name: string;
  capacity: number;
  status: TableStatus;
  locationId: string;
  currentOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TableState {
  tables: Table[];
  selectedTable: Table | null;
  isLoading: boolean;
  error: string | null;

  fetchTables: (locationId: string) => Promise<void>;
  selectTable: (table: Table | null) => void;
  updateTableStatus: (tableId: string, status: TableStatus, orderId?: string) => Promise<void>;
  refreshTable: (tableId: string) => Promise<void>;
  clearSelection: () => void;
}

export const useTableStore = create<TableState>((set) => ({
  tables: [],
  selectedTable: null,
  isLoading: false,
  error: null,

  fetchTables: async (locationId: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `/api/tables?locationId=${locationId}&status=available,occupied,reserved`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      const data = await response.json();
      set({ tables: data.data || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tables',
        isLoading: false,
      });
    }
  },

  selectTable: (table: Table | null) => {
    set({ selectedTable: table });
  },

  updateTableStatus: async (tableId: string, status: TableStatus, orderId?: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update table status');
      }

      set((state) => ({
        tables: state.tables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                status,
                currentOrderId: orderId,
                updatedAt: new Date(),
              }
            : table
        ),
        selectedTable:
          state.selectedTable?.id === tableId
            ? {
                ...state.selectedTable,
                status,
                currentOrderId: orderId,
                updatedAt: new Date(),
              }
            : state.selectedTable,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update table status',
      });
      throw error;
    }
  },

  refreshTable: async (tableId: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`);

      if (!response.ok) {
        throw new Error('Failed to refresh table');
      }

      const table = await response.json();

      set((state) => ({
        tables: state.tables.map((t) => (t.id === tableId ? table : t)),
        selectedTable: state.selectedTable?.id === tableId ? table : state.selectedTable,
      }));
    } catch (error) {
      console.error('Failed to refresh table:', error);
    }
  },

  clearSelection: () => {
    set({ selectedTable: null });
  },
}));
