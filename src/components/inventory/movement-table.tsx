'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS, type Movement } from '@/hooks/use-movements';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface MovementTableProps {
  movements: Movement[];
}

interface MovementWithBalance extends Movement {
  runningBalance: number;
}

export function MovementTable({ movements }: MovementTableProps) {
  // Calculate running balance
  const movementsWithBalance = useMemo(() => {
    let balance = 0;
    const result: MovementWithBalance[] = [];

    // Sort movements by date (oldest first) for correct balance calculation
    const sortedMovements = [...movements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const movement of sortedMovements) {
      const quantity = parseFloat(movement.quantity);

      // Add or subtract based on movement type
      if (['purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment'].includes(movement.type)) {
        balance += quantity;
      } else if (['sale', 'transfer_out', 'waste'].includes(movement.type)) {
        balance -= quantity;
      }

      result.push({
        ...movement,
        runningBalance: balance,
      });
    }

    // Reverse to show newest first
    return result.reverse();
  }, [movements]);

  const exportToExcel = () => {
    const exportData = movementsWithBalance.map((item) => ({
      Date: new Date(item.date).toLocaleString(),
      Type: MOVEMENT_TYPE_LABELS[item.type],
      Quantity: item.quantity,
      'Unit Price': item.unitPrice || 'N/A',
      'Running Balance': item.runningBalance.toFixed(2),
      Reference: item.referenceType ? `${item.referenceType} - ${item.referenceId}` : 'N/A',
      User: item.createdBy || 'System',
      Remarks: item.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movements');
    XLSX.writeFile(wb, `movement-history-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printReport = () => {
    window.print();
  };

  const getReferenceLink = (movement: Movement) => {
    if (!movement.referenceType || !movement.referenceId) return null;

    const linkMap: Record<string, string> = {
      order: `/dashboard/orders/${movement.referenceId}`,
      production: `/dashboard/production/${movement.referenceId}`,
      purchase: `/dashboard/purchases/${movement.referenceId}`,
      transfer: `/dashboard/transfers/${movement.referenceId}`,
    };

    return linkMap[movement.referenceType.toLowerCase()];
  };

  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No movements found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
        <Button variant="outline" size="sm" onClick={printReport}>
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Running Balance</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementsWithBalance.map((movement) => {
              const referenceLink = getReferenceLink(movement);
              const quantity = parseFloat(movement.quantity);
              const isIncrease = ['purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment'].includes(movement.type);

              return (
                <TableRow key={movement.id}>
                  <TableCell>
                    {new Date(movement.date).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={MOVEMENT_TYPE_COLORS[movement.type]}
                    >
                      {MOVEMENT_TYPE_LABELS[movement.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={isIncrease ? 'text-green-600' : 'text-red-600'}>
                      {isIncrease ? '+' : '-'}{quantity.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {movement.unitPrice ? `$${parseFloat(movement.unitPrice).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {movement.runningBalance.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {referenceLink ? (
                      <Link
                        href={referenceLink}
                        className="text-primary hover:underline"
                      >
                        {movement.referenceType} - {movement.referenceId}
                      </Link>
                    ) : movement.referenceType ? (
                      <span className="text-muted-foreground">
                        {movement.referenceType} - {movement.referenceId}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{movement.createdBy || 'System'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {movement.remarks || '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
