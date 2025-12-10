import { Metadata } from 'next';
import ProductionOrdersClient from '@/components/production-orders/production-orders-client';

export const metadata: Metadata = {
  title: 'Production Orders',
  description: 'Manage production orders and manufacturing workflows',
};

export default async function ProductionOrdersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Production Orders</h1>
        <p className="text-muted-foreground">
          Create and manage production orders for your recipes
        </p>
      </div>

      <ProductionOrdersClient />
    </div>
  );
}
