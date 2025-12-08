'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MovementTable } from '@/components/inventory/movement-table';
import { MovementFilters } from '@/components/inventory/movement-filters';
import { useMovements, type MovementType } from '@/hooks/use-movements';
import { Loader2 } from 'lucide-react';

export default function MovementHistoryPage() {
  const params = useParams();
  const inventoryId = params.id as string;

  const [filters, setFilters] = useState<{
    type?: MovementType;
    startDate?: string;
    endDate?: string;
  }>({
    type: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  const { data, isLoading, error } = useMovements({
    inventoryId,
    ...filters,
    page: 1,
    limit: 100, // Show more movements initially
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive text-lg font-semibold">Error loading movement history</p>
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : 'Unable to load movements. Please try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movement History</h1>
        <p className="text-muted-foreground">
          Track all inventory movements for this product
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter movements by type and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementFilters filters={filters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>
            {data?.total || 0} total movements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementTable movements={data?.data || []} />
        </CardContent>
      </Card>
    </div>
  );
}
