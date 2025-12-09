'use client';

import { useState } from 'react';
import { useCartStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Percent,
  DollarSign,
  Utensils,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckoutDialog } from './checkout-dialog';
import { TableSelectionDialog } from './table-selection-dialog';
import { PendingOrdersPanel } from './pending-orders-panel';
import { Badge } from '@/components/ui/badge';

interface CartSidebarProps {
  onClose?: () => void;
  locationId: string;
}

export function CartSidebar({ onClose, locationId }: CartSidebarProps) {
  const cart = useCartStore((state) => state.getActiveCart());
  const allCarts = useCartStore((state) => state.getAllCarts());
  const activeCartId = useCartStore((state) => state.activeCartId);
  const {
    updateQuantity,
    removeItem,
    applyItemDiscount,
    clear,
    createCart,
    switchCart,
  } = useCartStore();

  const [editingDiscount, setEditingDiscount] = useState<{
    itemId: string;
    value: string;
    type: 'percentage' | 'fixed';
  } | null>(null);

  const [showCheckout, setShowCheckout] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [showPendingOrders, setShowPendingOrders] = useState(false);

  // Count pending orders (carts with items that aren't the active cart)
  const pendingOrdersCount = allCarts.filter(
    (c) => c.items.length > 0 && c.id !== activeCartId
  ).length;

  if (!cart) {
    return (
      <div className='flex flex-col h-full'>
        {/* Header */}
        <div className='p-4 border-b flex items-center justify-between'>
          <h2 className='text-lg font-semibold flex items-center gap-2'>
            <ShoppingCart className='h-5 w-5' />
            Cart
          </h2>
          {onClose && (
            <Button variant='ghost' size='sm' onClick={onClose}>
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>

        <div className='flex-1 flex flex-col items-center justify-center p-8 text-center'>
          <ShoppingCart className='h-16 w-16 text-gray-300 mb-4' />
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            Cart is Empty
          </h3>
          <p className='text-sm text-gray-500'>Add products to get started</p>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleApplyDiscount = (
    itemId: string,
    discount: number,
    type: 'percentage' | 'fixed'
  ) => {
    applyItemDiscount(itemId, discount, type);
    setEditingDiscount(null);
    toast.success('Discount applied');
  };

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear the cart?')) {
      clear();
      toast.success('Cart cleared');
    }
  };

  const handleHoldOrder = () => {
    if (!cart || cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Create a new cart and switch to it
    const newCartId = createCart();
    switchCart(newCartId);
    toast.success('Order held - new cart ready');
  };

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='p-4 border-b'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-lg font-semibold flex items-center gap-2'>
            <ShoppingCart className='h-5 w-5' />
            Cart ({cart.items.length})
          </h2>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowPendingOrders(true)}
              className='relative'
            >
              <Clock className='h-4 w-4' />
              {pendingOrdersCount > 0 && (
                <Badge
                  variant='destructive'
                  className='absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
                >
                  {pendingOrdersCount}
                </Badge>
              )}
            </Button>
            {onClose && (
              <Button variant='ghost' size='sm' onClick={onClose}>
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-3'>
          {cart.items.map((item) => (
            <div
              key={item.id}
              className='bg-gray-50 rounded-lg p-3 border border-gray-200'
            >
              <div className='flex gap-3 mb-2'>
                <div className='w-16 h-16 rounded-md overflow-hidden bg-white border flex-shrink-0'>
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      className='object-cover w-full h-full'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center'>
                      <ShoppingCart className='h-6 w-6 text-gray-300' />
                    </div>
                  )}
                </div>

                <div className='flex-1 min-w-0'>
                  <h3 className='font-medium text-sm line-clamp-2 mb-1'>
                    {item.name}
                  </h3>
                  <p className='text-sm text-gray-600'>
                    ${item.price.toFixed(2)} each
                  </p>
                  {item.sku && (
                    <p className='text-xs text-gray-500'>SKU: {item.sku}</p>
                  )}
                </div>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeItem(item.id)}
                  className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>

              <div className='flex items-center gap-2 mb-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuantityChange(item.id, -1)}
                  className='h-8 w-8 p-0'
                >
                  <Minus className='h-3 w-3' />
                </Button>
                <Input
                  type='number'
                  value={item.quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1) {
                      updateQuantity(item.id, value);
                    }
                  }}
                  className='h-8 w-16 text-center'
                  min='1'
                />
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleQuantityChange(item.id, 1)}
                  className='h-8 w-8 p-0'
                >
                  <Plus className='h-3 w-3' />
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setEditingDiscount({
                      itemId: item.id,
                      value: item.discount.toString(),
                      type: item.discountType,
                    })
                  }
                  className={cn(
                    'h-8 ml-auto',
                    item.discount > 0 && 'bg-green-50 border-green-200'
                  )}
                >
                  <Percent className='h-3 w-3 mr-1' />
                  {item.discount > 0
                    ? item.discountType === 'percentage'
                      ? `${item.discount}%`
                      : `$${item.discount}`
                    : 'Discount'}
                </Button>
              </div>

              {editingDiscount?.itemId === item.id && (
                <div className='bg-white p-2 rounded border mt-2'>
                  <div className='flex gap-2 mb-2'>
                    <Button
                      variant={
                        editingDiscount.type === 'percentage'
                          ? 'default'
                          : 'outline'
                      }
                      size='sm'
                      onClick={() =>
                        setEditingDiscount({
                          ...editingDiscount,
                          type: 'percentage',
                        })
                      }
                      className='flex-1'
                    >
                      <Percent className='h-3 w-3 mr-1' />%
                    </Button>
                    <Button
                      variant={
                        editingDiscount.type === 'fixed' ? 'default' : 'outline'
                      }
                      size='sm'
                      onClick={() =>
                        setEditingDiscount({
                          ...editingDiscount,
                          type: 'fixed',
                        })
                      }
                      className='flex-1'
                    >
                      <DollarSign className='h-3 w-3 mr-1' />$
                    </Button>
                  </div>
                  <div className='flex gap-2'>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      value={editingDiscount.value}
                      onChange={(e) =>
                        setEditingDiscount({
                          ...editingDiscount,
                          value: e.target.value,
                        })
                      }
                      className='flex-1'
                      placeholder='Amount'
                      autoFocus
                    />
                    <Button
                      size='sm'
                      onClick={() =>
                        handleApplyDiscount(
                          item.id,
                          parseFloat(editingDiscount.value) || 0,
                          editingDiscount.type
                        )
                      }
                    >
                      Apply
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setEditingDiscount(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Item Total */}
              <div className='flex justify-between items-center mt-2 pt-2 border-t'>
                <span className='text-sm text-gray-600'>Subtotal:</span>
                <div className='text-right'>
                  {item.discount > 0 && (
                    <p className='text-xs text-gray-500 line-through'>
                      ${item.subtotal.toFixed(2)}
                    </p>
                  )}
                  <p className='font-semibold text-blue-600'>
                    ${item.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className='border-t p-4 space-y-3 bg-gray-50'>
        <Button
          variant='outline'
          className='w-full'
          onClick={() => setShowTableSelection(true)}
        >
          <Utensils className='h-4 w-4 mr-2' />
          {cart.tableName ? `Table: ${cart.tableName}` : 'Select Table'}
        </Button>

        {cart.customerName && (
          <div className='flex items-center gap-2 text-sm'>
            <User className='h-4 w-4 text-gray-500' />
            <span className='text-gray-600'>Customer:</span>
            <span className='font-medium'>{cart.customerName}</span>
          </div>
        )}

        <Separator />

        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-600'>Subtotal:</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>

          {cart.totalDiscount > 0 && (
            <div className='flex justify-between text-sm text-green-600'>
              <span>Discount:</span>
              <span>-${cart.totalDiscount.toFixed(2)}</span>
            </div>
          )}

          {cart.totalTax > 0 && (
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Tax:</span>
              <span>${cart.totalTax.toFixed(2)}</span>
            </div>
          )}

          <Separator />

          <div className='flex justify-between text-lg font-bold'>
            <span>Total:</span>
            <span className='text-blue-600'>${cart.total.toFixed(2)}</span>
          </div>
        </div>

        <div className='space-y-2'>
          <Button
            className='w-full'
            size='lg'
            onClick={handleCheckout}
            disabled={cart.items.length === 0}
          >
            Checkout
          </Button>

          <div className='grid grid-cols-2 gap-2'>
            <Button
              variant='outline'
              onClick={handleHoldOrder}
              disabled={cart.items.length === 0}
            >
              <Clock className='h-4 w-4 mr-2' />
              Hold Order
            </Button>

            <Button
              variant='outline'
              onClick={handleClearCart}
              disabled={cart.items.length === 0}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <CheckoutDialog
        open={showCheckout}
        onOpenChange={setShowCheckout}
        locationId={locationId}
      />

      <TableSelectionDialog
        open={showTableSelection}
        onOpenChange={setShowTableSelection}
        locationId={locationId}
      />

      <PendingOrdersPanel
        open={showPendingOrders}
        onOpenChange={setShowPendingOrders}
      />
    </div>
  );
}
