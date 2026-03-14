import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: string;
}

interface TopProductsChartProps {
  products: TopProduct[];
}

export function TopProductsChart({ products }: TopProductsChartProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            Top Selling Products (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-muted-foreground'>No sales data available</div>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...products.map((p) => parseFloat(p.totalRevenue)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <TrendingUp className='h-5 w-5' />
          Top Selling Products (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {products.map((product, index) => {
            const revenue = parseFloat(product.totalRevenue);
            const barWidth = (revenue / maxRevenue) * 100;

            return (
              <div key={product.productId} className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold text-muted-foreground w-6'>#{index + 1}</span>
                    <span className='font-medium'>{product.productName}</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-muted-foreground text-xs'>
                      {product.totalQuantity} sold
                    </span>
                    <span className='font-semibold'>{formatCurrency(revenue)}</span>
                  </div>
                </div>
                <div className='h-2 bg-muted rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all'
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
