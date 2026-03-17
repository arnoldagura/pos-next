import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconClassName?: string;
  iconBgClassName?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconClassName = 'text-blue-600',
  iconBgClassName = 'bg-blue-50 dark:bg-blue-950/40',
}: StatsCardProps) {
  return (
    <Card className='card-hover'>
      <CardContent className='pt-6'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1 flex-1'>
            <p className='text-sm font-medium text-muted-foreground'>{title}</p>
            <p className='text-3xl font-bold tracking-tight'>{value}</p>
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0', iconBgClassName)}>
            <Icon className={cn('h-5 w-5', iconClassName)} />
          </div>
        </div>
        <div className='mt-3 flex items-center gap-2'>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md',
                trend.isPositive
                  ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40'
                  : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className='h-3 w-3' />
              ) : (
                <TrendingDown className='h-3 w-3' />
              )}
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
          )}
          {description && <p className='text-xs text-muted-foreground truncate'>{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
