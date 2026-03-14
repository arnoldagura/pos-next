'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReceiptTemplate } from './receipt-template';
import { printReceipt } from '@/lib/utils/receipt-printer';
import { Printer, Download, Share2, Mail, CheckCircle2, Circle, Check } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReceiptItem {
  id?: string;
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  itemStatus?: string;
}

interface ReceiptData {
  orderNumber: string;
  orderDate: Date;
  location?: {
    name: string;
    address?: string;
    phone?: string;
  };
  items: ReceiptItem[];
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  total: string;
  paymentMethod: string | null;
  amountPaid: string;
  changeGiven: string;
  customerName?: string | null;
  tableNumber?: string | null;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData;
}

export function ReceiptDialog({ open, onOpenChange, receiptData }: ReceiptDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<Map<string, string>>(
    new Map(
      receiptData.items.map((item, idx) => [item.id || `item-${idx}`, item.itemStatus || 'pending'])
    )
  );

  const handleItemStatusToggle = async (itemId: string, currentStatus: string) => {
    const statusCycle: Record<string, string> = {
      pending: 'ready',
      ready: 'served',
      served: 'pending',
    };
    const nextStatus = statusCycle[currentStatus] || 'pending';

    try {
      const res = await fetch(`/api/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemStatus: nextStatus }),
      });

      if (res.ok) {
        setItemStatuses(new Map(itemStatuses).set(itemId, nextStatus));
      }
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const receiptHtml = renderToString(<ReceiptTemplate data={receiptData} />);
      printReceipt(receiptHtml);
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print receipt. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = () => {
    const receiptHtml = renderToString(<ReceiptTemplate data={receiptData} />);
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receiptData.orderNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receiptData.orderNumber}`,
          text: `Order ${receiptData.orderNumber} - Total: $${receiptData.total}`,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      alert('Sharing is not supported on this browser');
    }
  };

  const handleEmail = () => {
    // This would integrate with your email service
    alert('Email functionality will be implemented with email service integration');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Receipt & Items</DialogTitle>
          <DialogDescription>
            Order {receiptData.orderNumber} - {new Date(receiptData.orderDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='receipt' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='receipt'>Receipt</TabsTrigger>
            <TabsTrigger value='items'>
              Items ({Array.from(itemStatuses.values()).filter((s) => s === 'served').length}/
              {receiptData.items.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='receipt' className='my-4'>
            <ReceiptTemplate data={receiptData} />
          </TabsContent>

          <TabsContent value='items' className='my-4'>
            <div className='space-y-3'>
              <div className='text-sm text-muted-foreground mb-4'>
                Click items to cycle through: pending → ready → served
              </div>
              {receiptData.items.map((item, index) => {
                const itemId = item.id || `item-${index}`;
                const status = itemStatuses.get(itemId) || 'pending';

                const getStatusStyles = () => {
                  switch (status) {
                    case 'ready':
                      return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
                    case 'served':
                      return 'border-green-500 bg-green-50 dark:bg-green-950/30';
                    default:
                      return 'border-border hover:border-muted-foreground';
                  }
                };

                const getStatusIcon = () => {
                  switch (status) {
                    case 'ready':
                      return <Check className='h-5 w-5 text-yellow-600 dark:text-yellow-400' />;
                    case 'served':
                      return (
                        <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400' />
                      );
                    default:
                      return <Circle className='h-5 w-5 text-muted-foreground' />;
                  }
                };

                return (
                  <div
                    key={itemId}
                    onClick={() => handleItemStatusToggle(itemId, status)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${getStatusStyles()}`}
                  >
                    <div className='flex-shrink-0'>{getStatusIcon()}</div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-foreground'>
                        {item.quantity}x {item.productName}
                      </div>
                      {item.productSku && (
                        <div className='text-xs text-muted-foreground'>SKU: {item.productSku}</div>
                      )}
                    </div>
                    <div className='text-right flex-shrink-0'>
                      <div className='text-xs font-medium text-muted-foreground capitalize mb-1'>
                        {status}
                      </div>
                      <div className='font-semibold text-foreground'>${item.total}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className='flex gap-2 flex-wrap justify-center border-t pt-4'>
          <Button onClick={handlePrint} disabled={isPrinting} className='flex-1 min-w-[120px]'>
            <Printer className='h-4 w-4 mr-2' />
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
          <Button onClick={handleDownload} variant='outline' className='flex-1 min-w-[120px]'>
            <Download className='h-4 w-4 mr-2' />
            Download
          </Button>
          <Button onClick={handleShare} variant='outline' className='flex-1 min-w-[120px]'>
            <Share2 className='h-4 w-4 mr-2' />
            Share
          </Button>
          <Button onClick={handleEmail} variant='outline' className='flex-1 min-w-[120px]'>
            <Mail className='h-4 w-4 mr-2' />
            Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
