'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from './stats-card';
import { RecentOrdersTable } from './recent-orders-table';
import { LowStockList } from './low-stock-list';
import { TopProductsChart } from './top-products-chart';
import { OrderStatusChart } from './order-status-chart';
import { ExpiringMaterials } from './expiring-materials';
import { ProductionStatus } from './production-status';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  sales: {
    today: { total: string; count: number };
    week: { total: string; count: number };
    month: { total: string; count: number };
  };
  orderStatus: Array<{ status: string; count: number }>;
  lowStock: Array<{
    id: string;
    productId: string;
    sku: string | null;
    variantName: string | null;
    currentQuantity: string;
    alertThreshold: string;
    unitOfMeasure: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    paymentMethod: string | null;
    paymentStatus: string;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: string;
  }>;
  productionStatus: Array<{ status: string; count: number }>;
  inventory: {
    totalValue: string;
    totalItems: number;
  };
  expiringMaterials: Array<{
    id: string;
    materialInventoryId: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: string;
  }>;
  paymentMethods: Array<{
    paymentMethod: string | null;
    total: string;
    count: number;
  }>;
}

export function DashboardClient() {
  const {
    data: stats,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] gap-4'>
        <div className='text-destructive text-center'>
          <AlertTriangle className='h-12 w-12 mx-auto mb-2' />
          <p className='font-semibold'>Failed to load dashboard</p>
          <p className='text-sm text-muted-foreground'>{errorMessage}</p>
        </div>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Dashboard</h1>
        <Button onClick={() => refetch()} variant='outline' size='sm'>
          <RefreshCcw className='h-4 w-4 mr-2' />
          Refresh
        </Button>
      </div>

      {/* Sales Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title="Today's Sales"
          value={formatCurrency(parseFloat(stats.sales.today.total))}
          description={`${stats.sales.today.count} orders`}
          icon={DollarSign}
          iconClassName='text-green-600'
        />
        <StatsCard
          title='This Week'
          value={formatCurrency(parseFloat(stats.sales.week.total))}
          description={`${stats.sales.week.count} orders`}
          icon={TrendingUp}
          iconClassName='text-blue-600'
        />
        <StatsCard
          title='This Month'
          value={formatCurrency(parseFloat(stats.sales.month.total))}
          description={`${stats.sales.month.count} orders`}
          icon={ShoppingCart}
          iconClassName='text-purple-600'
        />
        <StatsCard
          title='Inventory Value'
          value={formatCurrency(parseFloat(stats.inventory.totalValue))}
          description={`${stats.inventory.totalItems} items in stock`}
          icon={Package}
          iconClassName='text-orange-600'
        />
      </div>

      {/* Charts Row */}
      <div className='grid gap-4 md:grid-cols-2'>
        <OrderStatusChart data={stats.orderStatus} />
        <ProductionStatus data={stats.productionStatus} />
      </div>

      {/* Top Products */}
      <TopProductsChart products={stats.topProducts} />

      {/* Low Stock Alerts */}
      {stats.lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-yellow-600' />
              Low Stock Alerts ({stats.lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockList items={stats.lowStock} />
          </CardContent>
        </Card>
      )}

      {/* Expiring Materials */}
      {stats.expiringMaterials.length > 0 && (
        <ExpiringMaterials materials={stats.expiringMaterials} />
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ShoppingCart className='h-5 w-5' />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentOrdersTable orders={stats.recentOrders} />
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {stats.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {stats.paymentMethods.map((method) => (
                <div
                  key={method.paymentMethod}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div>
                    <p className='text-sm font-medium capitalize'>
                      {method.paymentMethod
                        ? method.paymentMethod.replace('_', ' ')
                        : 'not specified'}
                    </p>
                    <p className='text-xs text-muted-foreground'>{method.count} transactions</p>
                  </div>
                  <p className='text-lg font-bold'>{formatCurrency(parseFloat(method.total))}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-10 w-48' />
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className='space-y-0 pb-2'>
              <Skeleton className='h-4 w-24' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-32' />
              <Skeleton className='h-3 w-20 mt-2' />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-48' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-48 w-full' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
