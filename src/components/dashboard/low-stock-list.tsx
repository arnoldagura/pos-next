import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LowStockItem {
  id: string;
  productId: string;
  sku: string | null;
  variantName: string | null;
  currentQuantity: string;
  alertThreshold: string;
  unitOfMeasure: string | null;
}

interface LowStockListProps {
  items: LowStockItem[];
}

export function LowStockList({ items }: LowStockListProps) {
  if (items.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>All products are well stocked</div>
    );
  }

  return (
    <div className='space-y-2'>
      {items.map((item) => {
        const current = parseFloat(item.currentQuantity);
        const threshold = parseFloat(item.alertThreshold);
        const percentage = (current / threshold) * 100;
        const isCritical = current <= threshold * 0.5;

        return (
          <Alert
            key={item.id}
            variant={isCritical ? 'destructive' : 'default'}
            className={!isCritical ? 'border-yellow-500' : ''}
          >
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription className='ml-2'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <div className='font-medium'>
                    {item.sku || item.productId}
                    {item.variantName && (
                      <span className='text-muted-foreground ml-2'>({item.variantName})</span>
                    )}
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Current: {current} {item.unitOfMeasure || 'units'} | Alert at: {threshold}{' '}
                    {item.unitOfMeasure || 'units'}
                  </div>
                </div>
                <Badge variant={isCritical ? 'destructive' : 'outline'}>
                  {percentage.toFixed(0)}% of threshold
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
