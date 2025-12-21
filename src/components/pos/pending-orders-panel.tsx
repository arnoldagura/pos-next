'use client';

import { useState, useMemo } from 'react';
import { useCartStore } from '@/stores';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  MapPin,
  User,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingOrdersPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PendingOrdersPanel({
  open,
  onOpenChange,
}: PendingOrdersPanelProps) {
  const carts = useCartStore((state) => state.carts);
  const activeCartId = useCartStore((state) => state.activeCartId);
  const switchCart = useCartStore((state) => state.switchCart);
  const deleteCart = useCartStore((state) => state.deleteCart);

  const [cartToDelete, setCartToDelete] = useState<string | null>(null);

  const allCarts = useMemo(() => Array.from(carts.values()), [carts]);

  const pendingCarts = allCarts.filter(
    (cart) => cart.items.length > 0 && cart.id !== activeCartId
  );

  const handleResumeCart = (cartId: string) => {
    switchCart(cartId);
    toast.success('Order resumed');
    onOpenChange?.(false);
  };

  const handleDeleteCart = (cartId: string) => {
    deleteCart(cartId);
    toast.success('Pending order deleted');
    setCartToDelete(null);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const content = (
    <>
      <SheetHeader>
        <SheetTitle className='flex items-center gap-2'>
          <Clock className='h-5 w-5' />
          Pending Orders
        </SheetTitle>
        <SheetDescription>
          View and manage orders that are on hold. Resume or cancel as needed.
        </SheetDescription>
      </SheetHeader>

      <Separator className='my-4' />

      <div className='flex items-center justify-between mb-4'>
        <p className='text-sm text-muted-foreground'>
          {pendingCarts.length} pending{' '}
          {pendingCarts.length === 1 ? 'order' : 'orders'}
        </p>
      </div>

      <ScrollArea className='flex-1 -mx-6 px-6'>
        {pendingCarts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <ShoppingCart className='h-16 w-16 text-muted-foreground/50 mb-4' />
            <h3 className='text-lg font-medium mb-2'>No Pending Orders</h3>
            <p className='text-sm text-muted-foreground'>
              Hold an order to save it for later
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {pendingCarts.map((cart) => (
              <div
                key={cart.id}
                className='border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors'
              >
                {/* Header */}
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <Badge variant='secondary' className='text-xs'>
                        <Clock className='h-3 w-3 mr-1' />
                        {formatTime(cart.createdAt)}
                      </Badge>
                      {cart.tableName && (
                        <Badge variant='default' className='text-xs'>
                          <MapPin className='h-3 w-3 mr-1' />
                          {cart.tableName}
                        </Badge>
                      )}
                    </div>
                    {cart.customerName && (
                      <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                        <User className='h-3 w-3' />
                        <span>{cart.customerName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Summary */}
                <div className='space-y-1 mb-3'>
                  <div className='flex items-center gap-2 text-sm'>
                    <Package className='h-4 w-4 text-muted-foreground' />
                    <span className='font-medium'>
                      {cart.items.length} item
                      {cart.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className='text-xs text-muted-foreground pl-6 space-y-0.5'>
                    {cart.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className='truncate'>
                        {item.quantity}x {item.name}
                      </div>
                    ))}
                    {cart.items.length > 3 && (
                      <div className='text-muted-foreground/70'>
                        +{cart.items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className='flex items-center justify-between pt-3 border-t'>
                  <span className='text-sm font-semibold'>Total:</span>
                  <span className='text-lg font-bold text-primary'>
                    ${cart.total.toFixed(2)}
                  </span>
                </div>

                {/* Actions */}
                <div className='flex gap-2 mt-3'>
                  <Button
                    onClick={() => handleResumeCart(cart.id)}
                    className='flex-1'
                    size='sm'
                  >
                    <CheckCircle2 className='h-4 w-4 mr-2' />
                    Resume
                  </Button>
                  <Button
                    onClick={() => setCartToDelete(cart.id)}
                    variant='outline'
                    size='sm'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!cartToDelete}
        onOpenChange={(open) => !open && setCartToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pending Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              pending order and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cartToDelete && handleDeleteCart(cartToDelete)}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (open !== undefined && onOpenChange !== undefined) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='right' className='w-full sm:max-w-md flex flex-col'>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline' className='relative'>
          <Clock className='h-4 w-4 mr-2' />
          Pending Orders
          {pendingCarts.length > 0 && (
            <Badge
              variant='destructive'
              className='ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
            >
              {pendingCarts.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side='right' className='w-full sm:max-w-md flex flex-col'>
        {content}
      </SheetContent>
    </Sheet>
  );
}
