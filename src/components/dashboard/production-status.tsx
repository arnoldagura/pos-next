import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory } from 'lucide-react';

interface ProductionStatus {
  status: string;
  count: number;
}

interface ProductionStatusProps {
  data: ProductionStatus[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  costing_done: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function ProductionStatus({ data }: ProductionStatusProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Factory className='h-5 w-5' />
          Production Orders Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>No production orders</div>
        ) : (
          <div className='grid grid-cols-2 gap-3'>
            {data.map((item) => (
              <div
                key={item.status}
                className='flex items-center justify-between p-3 rounded-lg border'
              >
                <Badge variant='secondary' className={statusColors[item.status] || 'bg-gray-100'}>
                  {item.status.replace('_', ' ')}
                </Badge>
                <div className='font-semibold text-lg'>{item.count}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
