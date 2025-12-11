'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Search, Filter, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ProductionOrderFormDialog from './production-order-form-dialog';

type ProductionOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'costing_done'
  | 'cancelled';

interface ProductionOrder {
  id: string;
  recipeId: string;
  locationId: string;
  plannedQuantity: string;
  actualQuantity: string | null;
  status: ProductionOrderStatus;
  outputType: 'product' | 'material';
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  materialCost: string;
  laborCost: string;
  overheadCost: string;
  totalCost: string;
  unitCost: string | null;
  suggestedPrice: string | null;
  notes: string | null;
  createdAt: string;
  recipe: {
    id: string;
    name: string;
    outputQuantity: string;
    unitOfMeasure: string;
  };
  location: {
    id: string;
    name: string;
  };
  outputProduct?: {
    id: string;
    name: string;
    image: string | null;
  };
  outputMaterial?: {
    id: string;
    name: string;
  };
}

const statusColors: Record<ProductionOrderStatus, string> = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
  costing_done: 'bg-purple-500',
  cancelled: 'bg-red-500',
};

const statusLabels: Record<ProductionOrderStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  costing_done: 'Costing Done',
  cancelled: 'Cancelled',
};

export default function ProductionOrdersClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/production-orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSchedule = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const response = await fetch(
        `/api/production-orders/${orderId}/schedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule order');
      }

      toast.success('Order scheduled successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error scheduling order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const response = await fetch(`/api/production-orders/${orderId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start production');
      }

      toast.success('Production started successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error starting production:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start production');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this production order?')) {
      return;
    }

    try {
      setActionLoading(orderId);
      const response = await fetch(`/api/production-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.outputProduct?.name || order.outputMaterial?.name || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="costing_done">Costing Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No production orders found
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/production-orders/${order.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">
                        {order.recipe.name}
                      </CardTitle>
                      <CardDescription>
                        {order.outputProduct?.name || order.outputMaterial?.name}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" disabled={actionLoading === order.id}>
                          {actionLoading === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/production-orders/${order.id}`);
                          }}
                          disabled={actionLoading === order.id}
                        >
                          View Details
                        </DropdownMenuItem>
                        {order.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSchedule(order.id);
                            }}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Scheduling...
                              </>
                            ) : (
                              'Schedule'
                            )}
                          </DropdownMenuItem>
                        )}
                        {order.status === 'scheduled' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStart(order.id);
                            }}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Starting...
                              </>
                            ) : (
                              'Start Production'
                            )}
                          </DropdownMenuItem>
                        )}
                        {(order.status === 'draft' ||
                          order.status === 'scheduled' ||
                          order.status === 'in_progress') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(order.id);
                              }}
                              disabled={actionLoading === order.id}
                              className="text-red-600"
                            >
                              {actionLoading === order.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                'Cancel Order'
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">
                        {order.plannedQuantity} {order.recipe.unitOfMeasure}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{order.location.name}</span>
                    </div>
                    {order.scheduledDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Scheduled:
                        </span>
                        <span className="font-medium">
                          {new Date(order.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {order.status === 'costing_done' && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Total Cost:</span>
                        <span className="font-bold text-green-600">
                          ${Number(order.totalCost).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center px-4">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ProductionOrderFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchOrders}
      />
    </div>
  );
}
