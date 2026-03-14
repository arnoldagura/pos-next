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
  UtensilsCrossed,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer';
type OrderType = 'dine_in' | 'takeout';

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
  const { updateTableStatus, clearSelection } = useTableStore();

  const [step, setStep] = useState<'payment' | 'processing' | 'success'>(
    'payment'
  );
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
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
      setOrderType('dine_in');
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
          orderType,
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

      // For non-cash payments, try to create PayMongo checkout
      if (selectedPayment !== 'cash') {
        try {
          const paymentRes = await fetch('/api/payments/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: data.order.id,
              orderNumber: data.order.orderNumber,
              items: cart.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                amount: item.total,
              })),
              total: cart.total,
              paymentMethod: selectedPayment,
            }),
          });

          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            // Open PayMongo checkout in new tab
            window.open(paymentData.checkoutUrl, '_blank');
            toast.success('Payment page opened. Complete payment in the new tab.');
          }
          // If PayMongo is not configured (503), fall through to success
        } catch (e) {
          console.error('PayMongo checkout error:', e);
          // Non-blocking: order is created, payment can be completed later
        }
      }

      if (cart.tableId) {
        try {
          await updateTableStatus(cart.tableId, 'available');
          clearSelection();
        } catch (error) {
          console.error('Failed to update table status:', error);
        }
      }

      setStep('success');
      toast.success(
        orderType === 'dine_in'
          ? 'Order sent to kitchen!'
          : 'Order completed successfully!'
      );
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
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col'>
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
          <div className='flex flex-col gap-0 flex-1 overflow-hidden'>
            <ScrollArea className='flex-1 overflow-hidden pr-4'>
              <div className='space-y-6 pr-4'>
            <div className='space-y-3'>
              <h3 className='text-lg font-semibold'>Order Summary</h3>
              <ScrollArea className='h-[200px] rounded-lg border bg-muted/50 p-4'>
                <div className='space-y-2'>
                  {cart.items.map((item) => (
                    <div key={item.id} className='flex justify-between text-sm'>
                      <div className='flex-1'>
                        <p className='font-medium text-foreground'>{item.name}</p>
                        <p className='text-muted-foreground text-xs'>
                          {item.quantity} x ${item.price.toFixed(2)}
                          {item.discount > 0 && (
                            <span className='text-green-600 dark:text-green-400 ml-2'>
                              -
                              {item.discountType === 'percentage'
                                ? `${item.discount}%`
                                : `$${item.discount}`}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className='font-semibold text-foreground'>${item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className='space-y-2 rounded-lg bg-muted/50 p-4'>
                <div className='flex justify-between text-sm text-muted-foreground'>
                  <span>Subtotal:</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                {cart.totalDiscount > 0 && (
                  <div className='flex justify-between text-sm text-green-600 dark:text-green-400'>
                    <span>Discount:</span>
                    <span>-${cart.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {cart.totalTax > 0 && (
                  <div className='flex justify-between text-sm text-muted-foreground'>
                    <span>Tax:</span>
                    <span>${cart.totalTax.toFixed(2)}</span>
                  </div>
                )}
                <Separator className='my-2' />
                <div className='flex justify-between text-base font-bold text-foreground'>
                  <span>Total:</span>
                  <span className='text-primary'>
                    ${cart.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <Label className='text-base font-semibold'>
                Order Type
              </Label>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  onClick={() => setOrderType('dine_in')}
                  className={cn(
                    'flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all min-h-[56px]',
                    orderType === 'dine_in'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border hover:border-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <UtensilsCrossed className='h-5 w-5 flex-shrink-0' />
                  <span className='font-semibold'>Dine In</span>
                </button>
                <button
                  onClick={() => setOrderType('takeout')}
                  className={cn(
                    'flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all min-h-[56px]',
                    orderType === 'takeout'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border hover:border-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <ShoppingBag className='h-5 w-5 flex-shrink-0' />
                  <span className='font-semibold'>Takeout</span>
                </button>
              </div>
            </div>

            <div className='space-y-3'>
              <Label className='text-base font-semibold'>
                Payment Method
              </Label>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all min-h-[100px]',
                      selectedPayment === method.id
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border hover:border-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <method.icon className='h-6 w-6 flex-shrink-0' />
                    <span className='font-semibold text-sm text-center'>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedPayment === 'cash' && (
              <div className='space-y-3'>
                <div>
                  <Label htmlFor='cashTendered' className='font-semibold'>
                    Cash Tendered
                  </Label>
                  <div className='relative mt-2'>
                    <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
                    <Input
                      id='cashTendered'
                      type='number'
                      step='0.01'
                      min='0'
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className='pl-10 text-lg min-h-[44px]'
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
                        ? 'border-green-500/30 bg-green-50 dark:bg-green-950/30'
                        : 'border-red-500/30 bg-red-50 dark:bg-red-950/30'
                    )}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-foreground'>
                        {change >= 0 ? 'Change:' : 'Insufficient:'}
                      </span>
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          change >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        ${Math.abs(change).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
              </div>
            </ScrollArea>

            <div className='flex gap-3 pt-4 border-t mt-4 flex-shrink-0'>
              <Button
                variant='outline'
                onClick={() => onOpenChange(false)}
                className='flex-1 min-h-[48px]'
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteOrder}
                disabled={!isValidPayment || loading}
                className='flex-1 min-h-[48px]'
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
              <div className='rounded-full bg-green-100 dark:bg-green-950/50 p-5 mb-4'>
                <CheckCircle2 className='h-14 w-14 text-green-600 dark:text-green-400' />
              </div>
              <h3 className='text-3xl font-bold text-green-600 dark:text-green-400 mb-3'>
                {orderType === 'dine_in' ? 'Sent to Kitchen!' : 'Order Complete!'}
              </h3>
              {orderNumber && (
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground mb-2'>Order Number</p>
                  <Badge className='text-lg px-4 py-1'>
                    {orderNumber}
                  </Badge>
                </div>
              )}
            </div>

            <div className='rounded-lg border bg-muted/50 p-4 space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Total Amount:</span>
                <span className='font-bold text-lg'>${cart.total.toFixed(2)}</span>
              </div>
              {selectedPayment === 'cash' && change > 0 && (
                <div className='flex justify-between items-center text-green-600 dark:text-green-400'>
                  <span>Change Given:</span>
                  <span className='font-bold text-lg'>${change.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Payment Method:</span>
                <span className='font-semibold capitalize'>
                  {selectedPayment.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={handlePrintReceipt}
                className='flex-1 min-h-[44px]'
              >
                <Printer className='h-4 w-4 mr-2' />
                Print Receipt
              </Button>
              <Button onClick={handleNewOrder} className='flex-1 min-h-[44px]'>
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
