'use client';

import { useState, useEffect } from 'react';
import { useCartStore, useTableStore } from '@/stores';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableOrderViewDialog } from './table-order-view-dialog';

interface TableSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}

const tableStatusConfig = {
  available: {
    label: 'Available',
    className: 'bg-green-500 hover:bg-green-600 text-white',
    badgeVariant: 'default' as const,
    badgeClassName: 'bg-green-500',
  },
  occupied: {
    label: 'Occupied',
    className: 'bg-red-500 hover:bg-red-600 text-white',
    badgeVariant: 'destructive' as const,
    badgeClassName: 'bg-red-500',
  },
  reserved: {
    label: 'Reserved',
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    badgeVariant: 'secondary' as const,
    badgeClassName: 'bg-yellow-500',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-gray-500 text-white cursor-not-allowed',
    badgeVariant: 'outline' as const,
    badgeClassName: 'bg-gray-500',
  },
};

export function TableSelectionDialog({
  open,
  onOpenChange,
  locationId,
}: TableSelectionDialogProps) {
  const { tables, isLoading, fetchTables, selectTable, selectedTable } =
    useTableStore();
  const { setTable } = useCartStore();
  const [viewingOrder, setViewingOrder] = useState<{
    tableId: string;
    tableName: string;
  } | null>(null);

  useEffect(() => {
    if (open && locationId) {
      fetchTables(locationId);
    }
  }, [open, locationId, fetchTables]);

  const handleSelectTable = async (table: typeof tables[0]) => {
    if (table.status === 'maintenance') {
      toast.error('Table is under maintenance');
      return;
    }

    if (table.status === 'occupied') {
      setViewingOrder({ tableId: table.id, tableName: table.name });
      return;
    }

    selectTable(table);
    setTable(table.id, table.name);
    toast.success(`Table ${table.name} selected`);
    onOpenChange(false);
  };

  const handleSelectOccupiedTable = () => {
    if (!viewingOrder) return;

    const table = tables.find((t) => t.id === viewingOrder.tableId);
    if (table) {
      selectTable(table);
      setTable(table.id, table.name);
      toast.success(`Table ${table.name} selected`);
      setViewingOrder(null);
      onOpenChange(false);
    }
  };

  return (
    <>
      <TableOrderViewDialog
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
        tableId={viewingOrder?.tableId || ''}
        tableName={viewingOrder?.tableName || ''}
        onSelectTable={handleSelectOccupiedTable}
      />

      <Dialog open={open && !viewingOrder} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Table</DialogTitle>
            <DialogDescription>
              Choose a table for the current order. Color indicators show table
              status.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No tables found for this location.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {tables.map((table) => {
                  const config = tableStatusConfig[table.status];
                  const isDisabled = table.status === 'maintenance';

                  return (
                    <button
                      key={table.id}
                      onClick={() => handleSelectTable(table)}
                      disabled={isDisabled}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-lg p-4 transition-all',
                        'border-2 border-transparent hover:border-primary',
                        config.className,
                        isDisabled && 'opacity-50'
                      )}
                    >
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={config.badgeVariant}
                          className={cn('text-xs', config.badgeClassName)}
                        >
                          {config.label}
                        </Badge>
                      </div>

                      <div className="text-2xl font-bold mb-2">
                        {table.number}
                      </div>
                      <div className="text-sm font-medium mb-1">
                        {table.name}
                      </div>
                      <div className="flex items-center text-xs opacity-90">
                        <Users className="mr-1 h-3 w-3" />
                        <span>{table.capacity} seats</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedTable && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Current selection:{' '}
                <span className="font-medium text-foreground">
                  {selectedTable.name}
                </span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
