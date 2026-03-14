import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const KitchenClient = dynamic(
  () =>
    import('@/components/kitchen/kitchen-client').then((mod) => ({
      default: mod.KitchenClient,
    })),
  {
    loading: () => <KitchenLoadingSkeleton />,
  }
);

function KitchenLoadingSkeleton() {
  return (
    <div className='h-screen p-4 animate-pulse'>
      <div className='h-12 bg-gray-200 rounded mb-4' />
      <div className='grid grid-cols-3 gap-4 h-[calc(100vh-5rem)]'>
        <div className='bg-gray-200 rounded' />
        <div className='bg-gray-200 rounded' />
        <div className='bg-gray-200 rounded' />
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <Suspense fallback={<KitchenLoadingSkeleton />}>
      <KitchenClient />
    </Suspense>
  );
}
