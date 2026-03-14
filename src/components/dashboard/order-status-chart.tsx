import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';

interface OrderStatus {
  status: string;
  count: number;
}

interface OrderStatusChartProps {
  data: OrderStatus[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ShoppingCart className='h-5 w-5' />
            Order Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-muted-foreground'>No orders yet</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <ShoppingCart className='h-5 w-5' />
          Order Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          <div className='flex h-4 rounded-full overflow-hidden'>
            {data.map((item) => {
              const percentage = (item.count / total) * 100;
              return (
                <div
                  key={item.status}
                  className={statusColors[item.status] || 'bg-gray-500'}
                  style={{ width: `${percentage}%` }}
                  title={`${item.status}: ${item.count} (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className='grid grid-cols-2 gap-3'>
            {data.map((item) => {
              const percentage = (item.count / total) * 100;
              return (
                <div
                  key={item.status}
                  className='flex items-center justify-between p-2 rounded-lg border'
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-gray-500'}`}
                    />
                    <Badge variant='secondary' className={statusBadgeColors[item.status]}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className='text-right'>
                    <div className='font-semibold'>{item.count}</div>
                    <div className='text-xs text-muted-foreground'>{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
