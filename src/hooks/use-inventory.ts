import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  locationId: string;
  locationName: string;
  alertThreshold: string;
  unitOfMeasure: string | null;
  currentStock: number;
  belowThreshold: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryResponse {
  inventory: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface LowStockItem {
  inventoryId: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  alertThreshold: number;
  difference: number;
  unitOfMeasure: string | null;
}

interface AdjustmentData {
  inventoryId: string;
  quantity: number;
  remarks: string;
  createdBy?: string;
}

export function useInventory(params?: {
  locationId?: string;
  productId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<InventoryResponse>({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.locationId) searchParams.append('locationId', params.locationId);
      if (params?.productId) searchParams.append('productId', params.productId);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`/api/inventory?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    },
  });
}

export function useLowStockItems(locationId?: string) {
  return useQuery<{ items: LowStockItem[]; count: number }>({
    queryKey: ['inventory', 'low-stock', locationId],
    queryFn: async () => {
      if (!locationId) return { items: [], count: 0 };
      const response = await fetch(`/api/inventory/low-stock?locationId=${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch low stock items');
      return response.json();
    },
    enabled: !!locationId,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AdjustmentData) => {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to adjust stock');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: string;
      locationId: string;
      alertThreshold: number;
      unitOfMeasure?: string;
    }) => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create inventory');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
