'use client';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  FileDown,
  Printer,
  History,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export interface InventoryItem {
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

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onAdjustStock: (inventoryId: string) => void;
  onEditSettings?: (item: InventoryItem) => void;
  locationId?: string;
}

export function InventoryTable({
  data,
  isLoading,
  onAdjustStock,
  onEditSettings,
  locationId,
}: InventoryTableProps) {
  const router = useRouter();
  const getStockStatus = (item: InventoryItem) => {
    if (item.belowThreshold) {
      return { label: 'Low Stock', variant: 'destructive' as const };
    }
    if (item.currentStock === 0) {
      return { label: 'Out of Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const getStockIndicator = (item: InventoryItem) => {
    if (item.currentStock === 0) return 'bg-red-500';
    if (item.belowThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const calculateValue = (item: InventoryItem) => {
    // Placeholder calculation - should use actual cost price
    return item.currentStock * 10;
  };

  const exportToExcel = () => {
    const exportData = data.map((item) => ({
      'Product Name': item.productName,
      SKU: item.productSku || 'N/A',
      Location: item.locationName,
      'Current Stock': item.currentStock,
      'Alert Threshold': item.alertThreshold,
      Unit: item.unitOfMeasure || 'pcs',
      Status: getStockStatus(item).label,
      'Estimated Value': `$${calculateValue(item).toFixed(2)}`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    // Auto-size columns
    const maxWidth = exportData.reduce(
      (w, r) => Math.max(w, Object.keys(r).length),
      10
    );
    ws['!cols'] = Array(maxWidth).fill({ wch: 15 });

    XLSX.writeFile(
      wb,
      `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const printReport = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .low-stock { color: #f59e0b; font-weight: bold; }
            .out-of-stock { color: #ef4444; font-weight: bold; }
            .in-stock { color: #10b981; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Inventory Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${locationId ? `<p>Location Filter: Active</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Location</th>
                <th>Stock</th>
                <th>Alert Level</th>
                <th>Status</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map((item) => {
                  const status = getStockStatus(item);
                  const statusClass =
                    item.currentStock === 0
                      ? 'out-of-stock'
                      : item.belowThreshold
                      ? 'low-stock'
                      : 'in-stock';
                  return `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.productSku || 'N/A'}</td>
                    <td>${item.locationName}</td>
                    <td>${item.currentStock} ${item.unitOfMeasure || 'pcs'}</td>
                    <td>${item.alertThreshold}</td>
                    <td class="${statusClass}">${status.label}</td>
                    <td>$${calculateValue(item).toFixed(2)}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-muted-foreground'>Loading inventory...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-64 space-y-2'>
        <p className='text-muted-foreground'>No inventory items found</p>
        <p className='text-sm text-muted-foreground'>
          Select a location to view inventory
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Action Buttons */}
      <div className='flex gap-2 justify-end'>
        <Button variant='outline' size='sm' onClick={exportToExcel}>
          <FileDown className='h-4 w-4 mr-2' />
          Export to Excel
        </Button>
        <Button variant='outline' size='sm' onClick={printReport}>
          <Printer className='h-4 w-4 mr-2' />
          Print Report
        </Button>
      </div>

      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className='text-right'>Stock</TableHead>
              <TableHead className='text-right'>Alert Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Value</TableHead>
              <TableHead className='w-[70px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const status = getStockStatus(item);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getStockIndicator(item)
                      )}
                    />
                  </TableCell>
                  <TableCell className='font-medium'>
                    {item.productName}
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {item.productSku || 'N/A'}
                  </TableCell>
                  <TableCell>{item.locationName}</TableCell>
                  <TableCell className='text-right'>
                    {item.currentStock} {item.unitOfMeasure || 'pcs'}
                  </TableCell>
                  <TableCell className='text-right'>
                    {item.alertThreshold}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    ${calculateValue(item).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => onAdjustStock(item.id)}
                        >
                          <Edit className='h-4 w-4 mr-2' />
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/inventory/${item.id}/movements`)
                          }
                        >
                          <History className='h-4 w-4 mr-2' />
                          View Movements
                        </DropdownMenuItem>
                        {onEditSettings && (
                          <DropdownMenuItem
                            onClick={() => onEditSettings(item)}
                          >
                            <Settings className='h-4 w-4 mr-2' />
                            Edit Settings
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
