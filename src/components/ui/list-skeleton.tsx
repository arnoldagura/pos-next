import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show a header toolbar skeleton (search bar + button) */
  showToolbar?: boolean;
}

/**
 * Drop-in skeleton for any table-based list page.
 */
export function TableSkeleton({ rows = 8, columns = 5, showToolbar = true }: TableSkeletonProps) {
  return (
    <div className='space-y-4'>
      {showToolbar && (
        <div className='flex items-center justify-between gap-3'>
          <Skeleton className='h-9 w-64' />
          <Skeleton className='h-9 w-32' />
        </div>
      )}
      <div className='rounded-md border overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className='h-4 w-24' />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <TableCell key={colIdx}>
                    <Skeleton
                      className='h-4'
                      style={{ width: `${60 + ((rowIdx * 3 + colIdx * 7) % 30)}%` }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface CardGridSkeletonProps {
  /** Number of skeleton cards */
  cards?: number;
  /** Grid columns class, e.g. "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" */
  gridClass?: string;
  /** Show a header toolbar skeleton */
  showToolbar?: boolean;
}

/**
 * Drop-in skeleton for any card-grid list page.
 */
export function CardGridSkeleton({
  cards = 6,
  gridClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  showToolbar = true,
}: CardGridSkeletonProps) {
  return (
    <div className='space-y-4'>
      {showToolbar && (
        <div className='flex items-center justify-between gap-3'>
          <Skeleton className='h-9 w-64' />
          <Skeleton className='h-9 w-32' />
        </div>
      )}
      <div className={`grid gap-4 ${gridClass}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className='rounded-lg border bg-card p-5 space-y-3'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-10 w-10 rounded-md shrink-0' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </div>
            </div>
            <Skeleton className='h-3 w-full' />
            <Skeleton className='h-3 w-5/6' />
            <div className='flex gap-2 pt-1'>
              <Skeleton className='h-6 w-16 rounded-full' />
              <Skeleton className='h-6 w-20 rounded-full' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
