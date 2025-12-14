import { Metadata } from 'next';
import InventoryMovementsClient from '@/components/product-inventories/inventory-movements-client';

export const metadata: Metadata = {
  title: 'Inventory Movements',
  description: 'View inventory movements history',
};

export default async function InventoryMovementsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;

  console.log('sad');
  return (
    <div className='container mx-auto py-6 space-y-6'>
      <InventoryMovementsClient inventoryId={id} />
    </div>
  );
}
