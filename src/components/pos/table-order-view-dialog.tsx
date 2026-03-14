'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Clock, DollarSign } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  tableId: string | null;
  status: string;
  paymentStatus: string;
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  total: string;
  createdAt: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
}

interface TableOrderViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableName: string;
  onSelectTable?: () => void;
}

export function TableOrderViewDialog({
  open,
  onOpenChange,
  tableId,
  tableName,
  onSelectTable,
}: TableOrderViewDialogProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/orders?tableId=${tableId}&status=pending,processing`);
        if (response.ok) {
          const data = await response.json();
          if (data.orders && data.orders.length > 0) {
            setOrder(data.orders[0]);
          } else {
            setOrder(null);
          }
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && tableId) {
      fetchOrder();
    }
  }, [open, tableId]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Table {tableName} - Current Order</DialogTitle>
          <DialogDescription>
            View the current order for this table or select it for a new order.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-40 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : !order ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <ShoppingCart className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-6'>No active order found for this table.</p>
            {onSelectTable && <Button onClick={onSelectTable}>Select Table</Button>}
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='flex items-center justify-between p-4 bg-muted rounded-lg'>
              <div>
                <p className='text-sm text-muted-foreground'>Order Number</p>
                <p className='text-lg font-semibold'>{order.orderNumber}</p>
              </div>
              <div className='flex gap-2'>
                <Badge variant='outline'>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </Badge>
              </div>
            </div>

            <div className='flex items-center text-sm text-muted-foreground'>
              <Clock className='mr-2 h-4 w-4' />
              <span>Created at {new Date(order.createdAt).toLocaleString()}</span>
            </div>

            <Separator />

            <ScrollArea className='h-[200px]'>
              <div className='space-y-2'>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div
                      key={item.id}
                      className='flex items-center justify-between p-3 bg-muted/50 rounded-md'
                    >
                      <div className='flex-1'>
                        <p className='font-medium'>{item.productName}</p>
                        <p className='text-sm text-muted-foreground'>
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className='font-semibold'>{formatCurrency(item.total)}</p>
                    </div>
                  ))
                ) : (
                  <p className='text-center text-muted-foreground py-4'>No items in this order</p>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Discount</span>
                <span className='text-red-600'>-{formatCurrency(order.totalDiscount)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Tax</span>
                <span>{formatCurrency(order.totalTax)}</span>
              </div>
              <Separator />
              <div className='flex justify-between text-lg font-bold'>
                <span>Total</span>
                <span className='flex items-center'>
                  <DollarSign className='h-5 w-5 mr-1' />
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {onSelectTable && (
              <>
                <Separator />
                <div className='flex gap-3'>
                  <Button onClick={onSelectTable} className='flex-1' variant='outline'>
                    Select Table (New Order)
                  </Button>
                  <Button onClick={() => onOpenChange(false)} className='flex-1'>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
