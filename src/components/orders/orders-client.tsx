'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Receipt, RefreshCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ReceiptDialog } from '@/components/receipts/receipt-dialog';
import { order, orderItem } from '@/drizzle/schema/orders';
import type { InferSelectModel } from 'drizzle-orm';

type Order = InferSelectModel<typeof order>;
type OrderItem = InferSelectModel<typeof orderItem>;

interface ReceiptData {
  orderNumber: string;
  orderDate: Date;
  location?: {
    name: string;
    address?: string;
    phone?: string;
  };
  items: {
    productName: string;
    productSku?: string | null;
    quantity: number;
    unitPrice: string;
    discount: string;
    total: string;
  }[];
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

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ready: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function OrdersClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ReceiptData | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', statusFilter, paymentFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentFilter !== 'all') params.set('paymentStatus', paymentFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  const filteredOrders = data?.orders?.filter((order: Order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.id?.toLowerCase().includes(query)
    );
  });

  const handleViewReceipt = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order details');

      const { order, items } = await response.json();

      setSelectedOrder({
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        location: order.locationName ? {
          name: order.locationName,
          address: order.locationAddress,
          phone: order.locationPhone,
        } : undefined,
        items: items.map((item: OrderItem) => ({
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        })),
        subtotal: order.subtotal,
        totalDiscount: order.totalDiscount,
        totalTax: order.totalTax,
        total: order.total,
        paymentMethod: order.paymentMethod,
        amountPaid: order.amountPaid,
        changeGiven: order.changeGiven,
        customerName: order.customerName,
        tableNumber: order.tableId,
      });
      setReceiptDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('Failed to load receipt. Please try again.');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      toast.success(
        newStatus === 'completed'
          ? 'Order marked as served'
          : newStatus === 'cancelled'
            ? 'Order cancelled'
            : `Order status updated to ${newStatus}`
      );
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Order History & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => refetch()} variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment Status</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Results {filteredOrders && `(${filteredOrders.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: Order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        {order.customerName || <span className="text-muted-foreground">Walk-in</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[order.status]}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={paymentStatusColors[order.paymentStatus]}
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {order.paymentMethod?.replace('_', ' ') || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(order.total))}
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                {order.status}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {order.status !== 'pending' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'pending')}>
                                  Pending
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'processing' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'processing')}>
                                  Processing
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'ready' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'ready')}>
                                  Ready
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'completed')}>
                                  Completed
                                </DropdownMenuItem>
                              )}
                              {order.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')}>
                                  Cancelled
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewReceipt(order.id)}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <ReceiptDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          receiptData={selectedOrder}
        />
      )}
    </div>
  );
}
