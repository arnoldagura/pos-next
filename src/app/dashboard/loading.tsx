import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className='min-h-screen p-4 md:p-8'>
      <div className='max-w-7xl mx-auto space-y-6'>
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
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-64' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-64 w-full' />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
