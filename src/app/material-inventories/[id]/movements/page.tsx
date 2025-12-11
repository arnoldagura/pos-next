import { Metadata } from 'next';
import MaterialInventoryMovementsClient from '@/components/material-inventories/material-inventory-movements-client';

export const metadata: Metadata = {
  title: 'Material Inventory Movements',
  description: 'View material inventory movements history',
};

export default async function MaterialInventoryMovementsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return (
    <div className='container mx-auto py-6 space-y-6'>
      <MaterialInventoryMovementsClient inventoryId={id} />
    </div>
  );
}
