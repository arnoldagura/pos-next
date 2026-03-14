import { useQuery } from '@tanstack/react-query';

export type MovementType =
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'waste'
  | 'transfer_in'
  | 'transfer_out'
  | 'production_output'
  | 'receive_from_material';

export interface Movement {
  id: string;
  inventoryId: string;
  type: MovementType;
  quantity: string;
  unitPrice: string | null;
  date: Date;
  remarks: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface MovementsResponse {
  data: Movement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseMovementsParams {
  inventoryId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useMovements(params?: UseMovementsParams) {
  return useQuery<MovementsResponse>({
    queryKey: ['movements', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.inventoryId) searchParams.append('inventoryId', params.inventoryId);
      if (params?.type) searchParams.append('type', params.type);
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`/api/product-inventories/movements?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch movements');
      return response.json();
    },
    enabled: !!params?.inventoryId,
  });
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  adjustment: 'Adjustment',
  waste: 'Waste',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  production_output: 'Production Output',
  receive_from_material: 'Receive from Material',
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  purchase: 'text-green-600 bg-green-50',
  sale: 'text-blue-600 bg-blue-50',
  adjustment: 'text-purple-600 bg-purple-50',
  waste: 'text-red-600 bg-red-50',
  transfer_in: 'text-cyan-600 bg-cyan-50',
  transfer_out: 'text-orange-600 bg-orange-50',
  production_output: 'text-indigo-600 bg-indigo-50',
  receive_from_material: 'text-teal-600 bg-teal-50',
};
