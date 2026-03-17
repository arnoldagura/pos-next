'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from './stats-card';
import { RecentOrdersTable } from './recent-orders-table';
import { LowStockList } from './low-stock-list';
import { TopProductsChart } from './top-products-chart';
import { OrderStatusChart } from './order-status-chart';
import { ExpiringMaterials } from './expiring-materials';
import { ProductionStatus } from './production-status';
import { DateRangeSelector, DateRange, getDefaultDateRange } from './date-range-selector';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  ShoppingCart,
  Package,
  RefreshCcw,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormatCurrency } from '@/hooks/use-org-settings';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  sales: {
    current: { total: string; count: number };
    previous: { total: string; count: number };
    averageOrderValue: string;
    previousAverageOrderValue: string;
    trends: {
      revenue: number | null;
      orders: number | null;
      avgOrder: number | null;
    };
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

function trendProps(value: number | null) {
  if (value === null) return undefined;
  return { value: Math.abs(value), isPositive: value >= 0 };
}

export function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const formatCurrency = useFormatCurrency();

  const {
    data: stats,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const response = await fetch(`/api/dashboard/stats?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
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
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <h1 className='text-3xl font-bold'>Dashboard</h1>
        <div className='flex items-center gap-2'>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <Button onClick={() => refetch()} variant='outline' size='sm'>
            <RefreshCcw className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Sales Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='Total Revenue'
          value={formatCurrency(parseFloat(stats.sales.current.total))}
          description={dateRange.label}
          icon={DollarSign}
          iconClassName='text-emerald-600'
          iconBgClassName='bg-emerald-50 dark:bg-emerald-950/40'
          trend={trendProps(stats.sales.trends.revenue)}
        />
        <StatsCard
          title='Orders'
          value={stats.sales.current.count}
          description={`prev: ${stats.sales.previous.count}`}
          icon={ShoppingCart}
          iconClassName='text-blue-600'
          iconBgClassName='bg-blue-50 dark:bg-blue-950/40'
          trend={trendProps(stats.sales.trends.orders)}
        />
        <StatsCard
          title='Avg. Order Value'
          value={formatCurrency(parseFloat(stats.sales.averageOrderValue))}
          description={`prev: ${formatCurrency(parseFloat(stats.sales.previousAverageOrderValue))}`}
          icon={Receipt}
          iconClassName='text-purple-600'
          iconBgClassName='bg-purple-50 dark:bg-purple-950/40'
          trend={trendProps(stats.sales.trends.avgOrder)}
        />
        <StatsCard
          title='Inventory Value'
          value={formatCurrency(parseFloat(stats.inventory.totalValue))}
          description={`${stats.inventory.totalItems} items in stock`}
          icon={Package}
          iconClassName='text-orange-600'
          iconBgClassName='bg-orange-50 dark:bg-orange-950/40'
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
            <CardTitle>Revenue by Payment Method</CardTitle>
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
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-48' />
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-16' />
        </div>
      </div>
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
