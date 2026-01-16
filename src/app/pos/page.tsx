import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const POSClient = dynamic(() => import('@/components/pos/pos-client').then(mod => ({ default: mod.POSClient })), {
  loading: () => <POSLoadingSkeleton />
});

function POSLoadingSkeleton() {
  return (
    <div className='h-screen p-4 animate-pulse'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 h-full'>
        <div className='lg:col-span-2 bg-gray-200 rounded'></div>
        <div className='bg-gray-200 rounded'></div>
      </div>
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={<POSLoadingSkeleton />}>
      <POSClient />
    </Suspense>
  );
}
