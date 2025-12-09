'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  CheckCircle2,
  Printer,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  locationId,
}: CheckoutDialogProps) {
  const cart = useCartStore((state) => state.getActiveCart());
  const clear = useCartStore((state) => state.clear);

  const [step, setStep] = useState<'payment' | 'processing' | 'success'>(
    'payment'
  );
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const paymentMethods = [
    { id: 'cash' as const, label: 'Cash', icon: Banknote },
    { id: 'card' as const, label: 'Credit/Debit Card', icon: CreditCard },
    { id: 'gcash' as const, label: 'GCash', icon: Smartphone },
    { id: 'maya' as const, label: 'Maya', icon: Smartphone },
    { id: 'bank_transfer' as const, label: 'Bank Transfer', icon: DollarSign },
  ];

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const change = tenderedAmount - (cart?.total || 0);
  const isValidPayment =
    selectedPayment !== 'cash' || tenderedAmount >= (cart?.total || 0);

  useEffect(() => {
    if (open) {
      setStep('payment');
      setSelectedPayment('cash');
      setCashTendered('');
      setOrderId(null);
      setOrderNumber(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedPayment !== 'cash' && cart) {
      setCashTendered(cart.total.toFixed(2));
    }
  }, [selectedPayment, cart]);

  const handleCompleteOrder = async () => {
    if (!cart || !isValidPayment) return;

    setLoading(true);
    setStep('processing');

    try {
      const stockValidation = await fetch('/api/orders/validate-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          locationId,
        }),
      });

      if (!stockValidation.ok) {
        const error = await stockValidation.json();
        toast.error(error.error || 'Stock validation failed');
        setStep('payment');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          tableId: cart.tableId,
          tableName: cart.tableName,
          customerId: cart.customerId,
          customerName: cart.customerName,
          paymentMethod: selectedPayment,
          amountPaid: tenderedAmount,
          changeGiven: selectedPayment === 'cash' ? Math.max(0, change) : 0,
          items: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            productSku: item.sku,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: item.discount,
            discountType: item.discountType,
            taxRate: item.taxRate,
            subtotal: item.subtotal,
            total: item.total,
            notes: item.notes,
          })),
          subtotal: cart.subtotal,
          totalDiscount: cart.totalDiscount,
          totalTax: cart.totalTax,
          total: cart.total,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const data = await response.json();
      setOrderId(data.order.id);
      setOrderNumber(data.order.orderNumber);
      setStep('success');
      toast.success('Order completed successfully!');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete order'
      );
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    toast.info('Receipt printing not implemented yet');
  };

  const handleNewOrder = () => {
    clear();
    onOpenChange(false);
  };

  if (!cart) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span className='d-none'>{orderId}</span>
            <ShoppingCart className='h-5 w-5' />
            {step === 'payment' && 'Checkout'}
            {step === 'processing' && 'Processing Order'}
            {step === 'success' && 'Order Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'payment' && 'Review order and select payment method'}
            {step === 'processing' &&
              'Please wait while we process your order...'}
            {step === 'success' && 'Your order has been successfully placed'}
          </DialogDescription>
        </DialogHeader>

        {step === 'payment' && (
          <div className='space-y-6'>
            <div>
              <h3 className='font-semibold mb-3'>Order Summary</h3>
              <ScrollArea className='h-[200px] rounded-md border p-4'>
                <div className='space-y-3'>
                  {cart.items.map((item) => (
                    <div key={item.id} className='flex justify-between text-sm'>
                      <div className='flex-1'>
                        <p className='font-medium'>{item.name}</p>
                        <p className='text-gray-500'>
                          {item.quantity} x ${item.price.toFixed(2)}
                          {item.discount > 0 && (
                            <span className='text-green-600 ml-2'>
                              -
                              {item.discountType === 'percentage'
                                ? `${item.discount}%`
                                : `$${item.discount}`}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className='font-medium'>${item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className='mt-4 space-y-2 border-t pt-3'>
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
                  <span className='text-blue-600'>
                    ${cart.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className='text-base font-semibold mb-3 block'>
                Payment Method
              </Label>
              <div className='grid grid-cols-2 gap-3'>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
                      'hover:border-blue-300 hover:bg-blue-50',
                      selectedPayment === method.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200'
                    )}
                  >
                    <method.icon className='h-5 w-5 text-gray-600' />
                    <span className='font-medium text-sm'>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedPayment === 'cash' && (
              <div className='space-y-3'>
                <div>
                  <Label htmlFor='cashTendered'>Cash Tendered</Label>
                  <div className='relative mt-1'>
                    <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                    <Input
                      id='cashTendered'
                      type='number'
                      step='0.01'
                      min='0'
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className='pl-9 text-lg'
                      placeholder='0.00'
                      autoFocus
                    />
                  </div>
                </div>

                {cashTendered && (
                  <div
                    className={cn(
                      'p-4 rounded-lg border-2',
                      change >= 0
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    )}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-medium'>
                        {change >= 0 ? 'Change:' : 'Insufficient:'}
                      </span>
                      <span
                        className={cn(
                          'text-xl font-bold',
                          change >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        ${Math.abs(change).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={() => onOpenChange(false)}
                className='flex-1'
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteOrder}
                disabled={!isValidPayment || loading}
                className='flex-1'
              >
                {loading ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='h-4 w-4 mr-2' />
                    Complete Order
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className='flex flex-col items-center justify-center py-12'>
            <Loader2 className='h-16 w-16 text-blue-600 animate-spin mb-4' />
            <p className='text-lg font-medium'>Processing your order...</p>
            <p className='text-sm text-gray-500 mt-2'>Please wait</p>
          </div>
        )}

        {step === 'success' && (
          <div className='space-y-6'>
            <div className='flex flex-col items-center justify-center py-8'>
              <div className='rounded-full bg-green-100 p-4 mb-4'>
                <CheckCircle2 className='h-12 w-12 text-green-600' />
              </div>
              <h3 className='text-2xl font-bold text-green-600 mb-2'>
                Order Complete!
              </h3>
              {orderNumber && (
                <p className='text-gray-600'>
                  Order Number:{' '}
                  <Badge variant='secondary' className='text-base'>
                    {orderNumber}
                  </Badge>
                </p>
              )}
            </div>

            <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Total Amount:</span>
                <span className='font-bold'>${cart.total.toFixed(2)}</span>
              </div>
              {selectedPayment === 'cash' && change > 0 && (
                <div className='flex justify-between text-green-600'>
                  <span>Change Given:</span>
                  <span className='font-bold'>${change.toFixed(2)}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-gray-600'>Payment Method:</span>
                <span className='font-medium capitalize'>
                  {selectedPayment.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={handlePrintReceipt}
                className='flex-1'
              >
                <Printer className='h-4 w-4 mr-2' />
                Print Receipt
              </Button>
              <Button onClick={handleNewOrder} className='flex-1'>
                <ShoppingCart className='h-4 w-4 mr-2' />
                New Order
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
