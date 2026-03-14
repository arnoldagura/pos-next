import { Metadata } from 'next';
import MaterialInventoriesClient from '@/components/material-inventories/material-inventories-client';

export const metadata: Metadata = {
  title: 'Material Inventories',
  description: 'Manage raw material and ingredient inventories',
};

export default async function MaterialInventoriesPage() {
  return (
    <div className='container mx-auto py-6 space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Material Inventories</h1>
        <p className='text-muted-foreground'>
          Track and manage raw materials, ingredients, and supplies across your locations
        </p>
      </div>

      <MaterialInventoriesClient />
    </div>
  );
}
