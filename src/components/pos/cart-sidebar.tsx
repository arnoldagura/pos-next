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
  MapPin,
  Percent,
  DollarSign,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CartSidebarProps {
  onClose?: () => void;
}

export function CartSidebar({ onClose }: CartSidebarProps) {
  const cart = useCartStore((state) => state.getActiveCart());
  const {
    updateQuantity,
    removeItem,
    applyItemDiscount,
    clear,
  } = useCartStore();

  const [editingDiscount, setEditingDiscount] = useState<{
    itemId: string;
    value: string;
    type: 'percentage' | 'fixed';
  } | null>(null);

  if (!cart) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart
          </h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Cart is Empty
          </h3>
          <p className="text-sm text-gray-500">
            Add products to get started
          </p>
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
    // TODO: Implement checkout flow
    toast.info('Checkout flow not yet implemented');
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear the cart?')) {
      clear();
      toast.success('Cart cleared');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Cart ({cart.items.length})
        </h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              {/* Item Header */}
              <div className="flex gap-3 mb-2">
                {/* Image */}
                <div className="w-16 h-16 rounded-md overflow-hidden bg-white border flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    ${item.price.toFixed(2)} each
                  </p>
                  {item.sku && (
                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.id, -1)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1) {
                      updateQuantity(item.id, value);
                    }
                  }}
                  className="h-8 w-16 text-center"
                  min="1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(item.id, 1)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>

                {/* Discount Button */}
                <Button
                  variant="outline"
                  size="sm"
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
                  <Percent className="h-3 w-3 mr-1" />
                  {item.discount > 0
                    ? item.discountType === 'percentage'
                      ? `${item.discount}%`
                      : `$${item.discount}`
                    : 'Discount'}
                </Button>
              </div>

              {/* Discount Editor */}
              {editingDiscount?.itemId === item.id && (
                <div className="bg-white p-2 rounded border mt-2">
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant={
                        editingDiscount.type === 'percentage' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() =>
                        setEditingDiscount({ ...editingDiscount, type: 'percentage' })
                      }
                      className="flex-1"
                    >
                      <Percent className="h-3 w-3 mr-1" />%
                    </Button>
                    <Button
                      variant={
                        editingDiscount.type === 'fixed' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() =>
                        setEditingDiscount({ ...editingDiscount, type: 'fixed' })
                      }
                      className="flex-1"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />$
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingDiscount.value}
                      onChange={(e) =>
                        setEditingDiscount({
                          ...editingDiscount,
                          value: e.target.value,
                        })
                      }
                      className="flex-1"
                      placeholder="Amount"
                      autoFocus
                    />
                    <Button
                      size="sm"
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
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDiscount(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Item Total */}
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <div className="text-right">
                  {item.discount > 0 && (
                    <p className="text-xs text-gray-500 line-through">
                      ${item.subtotal.toFixed(2)}
                    </p>
                  )}
                  <p className="font-semibold text-blue-600">
                    ${item.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Order Info */}
      <div className="border-t p-4 space-y-3 bg-gray-50">
        {/* Table/Customer Info */}
        {(cart.tableName || cart.customerName) && (
          <div className="space-y-1">
            {cart.tableName && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Table:</span>
                <span className="font-medium">{cart.tableName}</span>
              </div>
            )}
            {cart.customerName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{cart.customerName}</span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span>${cart.subtotal.toFixed(2)}</span>
          </div>

          {cart.totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount:</span>
              <span>-${cart.totalDiscount.toFixed(2)}</span>
            </div>
          )}

          {cart.totalTax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span>${cart.totalTax.toFixed(2)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-blue-600">${cart.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={cart.items.length === 0}
          >
            Checkout
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleClearCart}
            disabled={cart.items.length === 0}
          >
            Clear Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
