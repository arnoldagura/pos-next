import { Metadata } from 'next';
import ProductionOrderDetailClient from '@/components/production-orders/production-order-detail-client';

export const metadata: Metadata = {
  title: 'Production Order Details',
  description: 'View and manage production order details',
};

export default async function ProductionOrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return (
    <div className='container mx-auto py-6'>
      <ProductionOrderDetailClient orderId={id} />
    </div>
  );
}
