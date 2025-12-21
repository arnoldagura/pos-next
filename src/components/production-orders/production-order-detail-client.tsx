'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Play,
  CheckCircle,
  DollarSign,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import CompleteProductionDialog from './complete-production-dialog';
import FinalizeCostsDialog from './finalize-costs-dialog';
import { MaterialInventory } from '@/lib/types';

type ProductionOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'costing_done'
  | 'cancelled';

interface ProductionOrder {
  id: string;
  recipeId: string;
  locationId: string;
  plannedQuantity: string;
  actualQuantity: string | null;
  status: ProductionOrderStatus;
  outputType: 'product' | 'material';
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  materialCost: string;
  laborCost: string;
  overheadCost: string;
  totalCost: string;
  unitCost: string | null;
  suggestedPrice: string | null;
  notes: string | null;
  createdAt: string;
  recipe: {
    id: string;
    name: string;
    description: string | null;
    outputQuantity: string;
    unitOfMeasure: string;
    preparationTime: number | null;
    cookingTime: number | null;
    instructions: string | null;
    ingredients: Array<{
      id: string;
      materialId: string;
      quantity: string;
      unitOfMeasure: string;
      notes: string | null;
      material: {
        id: string;
        name: string;
        unitOfMeasure: string;
      };
    }>;
  };
  location: {
    id: string;
    name: string;
    type: string;
  };
  outputProduct?: {
    id: string;
    name: string;
    image: string | null;
  };
  outputMaterial?: Pick<MaterialInventory, 'id'> & {
    material: Pick<MaterialInventory['material'], 'name'>;
  };
  materials: Array<ProductionMaterial>;
}
interface ProductionMaterial {
  id: string;
  materialInventoryId: string;
  plannedQuantity: string;
  actualQuantity: string | null;
  unitOfMeasure: string;
  unitCost: string | null;
  totalCost: string | null;
  materialInventory: {
    id: string;
    variantName: string | null;
    material: {
      id: string;
      name: string;
    };
  };
}
interface MaterialAvailability {
  materialId: string;
  required: number;
  available: number;
  sufficient: boolean;
  unitOfMeasure: string;
}

const statusColors: Record<ProductionOrderStatus, string> = {
  draft: '0',
  scheduled: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
  costing_done: 'bg-purple-500',
  cancelled: 'bg-red-500',
};

const statusLabels: Record<ProductionOrderStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  costing_done: 'Costing Done',
  cancelled: 'Cancelled',
};

interface ProductionOrderDetailClientProps {
  orderId: string;
}

export default function ProductionOrderDetailClient({
  orderId,
}: ProductionOrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [availability, setAvailability] = useState<MaterialAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/production-orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      console.log('data', data);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load production order');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `/api/production-orders/${orderId}/check-availability`
      );
      if (!response.ok) throw new Error('Failed to check availability');
      const data = await response.json();
      console.log('data.availability', data.availability);
      setAvailability(data.availability || []);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  useEffect(() => {
    fetchOrder();
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleSchedule = async () => {
    try {
      setActionLoading('schedule');
      const response = await fetch(
        `/api/production-orders/${orderId}/schedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule order');
      }

      toast.success('Order scheduled successfully');
      fetchOrder();
      fetchAvailability();
    } catch (error) {
      console.error('Error scheduling order:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to schedule order'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async () => {
    try {
      setActionLoading('start');
      const response = await fetch(`/api/production-orders/${orderId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start production');
      }

      toast.success('Production started successfully');
      fetchOrder();
    } catch (error) {
      console.error('Error starting production:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to start production'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this production order?')) {
      return;
    }

    try {
      setActionLoading('cancel');
      const response = await fetch(`/api/production-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to cancel order'
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className='space-y-4'>
        <div className='h-8 bg-gray-200 rounded w-1/4 animate-pulse'></div>
        <div className='h-64 bg-gray-200 rounded animate-pulse'></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className='text-center py-12'>
        <p className='text-muted-foreground'>Production order not found</p>
        <Button
          onClick={() => router.push('/production-orders')}
          className='mt-4'
        >
          Back to Orders
        </Button>
      </div>
    );
  }

  const scalingFactor =
    parseFloat(order.plannedQuantity) / parseFloat(order.recipe.outputQuantity);
  const allMaterialsSufficient = availability.every((item) => item.sufficient);

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => router.push('/production-orders')}
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back
        </Button>
      </div>

      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold'>{order.recipe.name}</h1>
          <p className='text-muted-foreground'>
            {order.outputProduct?.name || order.outputMaterial?.material?.name}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge className={statusColors[order.status]}>
            {statusLabels[order.status]}
          </Badge>
          {order.status === 'draft' && (
            <Button
              onClick={handleSchedule}
              disabled={!allMaterialsSufficient || actionLoading === 'schedule'}
            >
              {actionLoading === 'schedule' ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className='h-4 w-4 mr-2' />
                  Schedule
                </>
              )}
            </Button>
          )}
          {order.status === 'scheduled' && (
            <Button onClick={handleStart} disabled={actionLoading === 'start'}>
              {actionLoading === 'start' ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Starting...
                </>
              ) : (
                <>
                  <Play className='h-4 w-4 mr-2' />
                  Start Production
                </>
              )}
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button onClick={() => setCompleteDialogOpen(true)}>
              <CheckCircle className='h-4 w-4 mr-2' />
              Complete
            </Button>
          )}
          {order.status === 'completed' && (
            <Button onClick={() => setFinalizeDialogOpen(true)}>
              <DollarSign className='h-4 w-4 mr-2' />
              Finalize Costs
            </Button>
          )}
          {(order.status === 'draft' ||
            order.status === 'scheduled' ||
            order.status === 'in_progress') && (
            <Button
              variant='destructive'
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
            >
              {actionLoading === 'cancel' ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className='h-4 w-4 mr-2' />
                  Cancel
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 gap-3'>
              <div className='flex items-start justify-between p-3 rounded-lg bg-muted/50'>
                <div className='flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-primary' />
                  <span className='text-sm text-muted-foreground'>
                    Location
                  </span>
                </div>
                <span className='font-medium text-sm'>
                  {order.location.name}
                </span>
              </div>

              <div className='flex items-start justify-between p-3 rounded-lg bg-muted/50'>
                <div className='flex items-center gap-2'>
                  <Package className='h-4 w-4 text-primary' />
                  <span className='text-sm text-muted-foreground'>
                    Planned Quantity
                  </span>
                </div>
                <span className='font-medium text-sm'>
                  {order.plannedQuantity} {order.recipe.unitOfMeasure}
                </span>
              </div>

              {order.actualQuantity && (
                <div className='flex items-start justify-between p-3 rounded-lg bg-green-50 border border-green-200'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-600' />
                    <span className='text-sm text-green-900'>
                      Actual Quantity
                    </span>
                  </div>
                  <span className='font-medium text-sm text-green-900'>
                    {order.actualQuantity} {order.recipe.unitOfMeasure}
                  </span>
                </div>
              )}

              {order.scheduledDate && (
                <div className='flex items-start justify-between p-3 rounded-lg bg-muted/50'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-4 w-4 text-primary' />
                    <span className='text-sm text-muted-foreground'>
                      Scheduled Date
                    </span>
                  </div>
                  <span className='font-medium text-sm'>
                    {new Date(order.scheduledDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {order.startedAt && (
                <div className='flex items-start justify-between p-3 rounded-lg bg-muted/50'>
                  <div className='flex items-center gap-2'>
                    <Clock className='h-4 w-4 text-primary' />
                    <span className='text-sm text-muted-foreground'>
                      Started
                    </span>
                  </div>
                  <span className='font-medium text-sm'>
                    {new Date(order.startedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {order.completedAt && (
                <div className='flex items-start justify-between p-3 rounded-lg bg-muted/50'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-primary' />
                    <span className='text-sm text-muted-foreground'>
                      Completed
                    </span>
                  </div>
                  <span className='font-medium text-sm'>
                    {new Date(order.completedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            <div className='flex items-center justify-between p-3 rounded-lg bg-primary/5'>
              <span className='text-sm font-medium text-primary'>
                Recipe Scaling Factor
              </span>
              <span className='font-bold text-primary'>
                {scalingFactor.toFixed(2)}x
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Material Cost:</span>
              <span className='font-medium'>
                ${Number(order.materialCost).toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Labor Cost:</span>
              <span className='font-medium'>
                ${Number(order.laborCost).toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Overhead Cost:</span>
              <span className='font-medium'>
                ${Number(order.overheadCost).toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <span className='font-semibold'>Total Cost:</span>
              <span className='font-bold text-lg'>
                ${Number(order.totalCost).toFixed(2)}
              </span>
            </div>
            {order.unitCost && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Unit Cost:</span>
                <span className='font-medium'>
                  ${Number(order.unitCost).toFixed(2)}
                </span>
              </div>
            )}
            {order.suggestedPrice && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Suggested Price:</span>
                <span className='font-medium text-green-600'>
                  ${Number(order.suggestedPrice).toFixed(2)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Requirements</CardTitle>
          <CardDescription>
            Ingredients and material inventories for this production order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {order.materials.map((material, index) => {
              const availabilityInfo = availability.find(
                (a) => a.materialId === material.materialInventory.material?.id
              );
              console.log('availabilityInfo', availabilityInfo);
              return (
                <Card key={material.id}>
                  <CardContent className='pt-4 pb-4'>
                    <div className='flex items-start justify-between mb-3'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-xs font-medium text-muted-foreground'>
                            Ingredient #{index + 1}
                          </span>
                          <span className='text-sm font-semibold text-primary'>
                            {material.materialInventory.material?.name}
                          </span>
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          From inventory:{' '}
                          {material.materialInventory.variantName ||
                            material.materialInventory.material?.name}
                        </div>
                      </div>
                      {availabilityInfo && (
                        <div className='flex items-center gap-2'>
                          {availabilityInfo.sufficient ? (
                            <Badge
                              variant='outline'
                              className='bg-green-50 text-green-700'
                            >
                              <CheckCircle className='h-3 w-3 mr-1' />
                              Available: {availabilityInfo.available.toFixed(2)}
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className='bg-red-50 text-red-700'
                            >
                              <AlertCircle className='h-3 w-3 mr-1' />
                              Insufficient:{' '}
                              {availabilityInfo.available.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                      <div>
                        <div className='text-muted-foreground text-xs mb-1'>
                          Planned Quantity
                        </div>
                        <div className='font-medium'>
                          {material.plannedQuantity} {material.unitOfMeasure}
                        </div>
                      </div>
                      {material.actualQuantity && (
                        <div>
                          <div className='text-muted-foreground text-xs mb-1'>
                            Actual Quantity
                          </div>
                          <div className='font-medium'>
                            {material.actualQuantity} {material.unitOfMeasure}
                          </div>
                        </div>
                      )}
                      {material.unitCost && (
                        <div>
                          <div className='text-muted-foreground text-xs mb-1'>
                            Unit Cost
                          </div>
                          <div className='font-medium'>
                            ${Number(material.unitCost).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {material.totalCost && (
                        <div>
                          <div className='text-muted-foreground text-xs mb-1'>
                            Total Cost
                          </div>
                          <div className='font-medium'>
                            ${Number(material.totalCost).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!allMaterialsSufficient && order.status === 'draft' && (
            <div className='mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <div className='flex items-start gap-2'>
                <AlertCircle className='h-5 w-5 text-yellow-600 mt-0.5' />
                <div>
                  <p className='font-medium text-yellow-900'>
                    Insufficient Materials
                  </p>
                  <p className='text-sm text-yellow-700 mt-1'>
                    Some materials are not available in sufficient quantities.
                    Please restock before scheduling this order.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {order.recipe.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Production Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='whitespace-pre-wrap text-sm'>
              {order.recipe.instructions}
            </pre>
          </CardContent>
        </Card>
      )}

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm'>{order.notes}</p>
          </CardContent>
        </Card>
      )}

      <CompleteProductionDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        orderId={orderId}
        plannedQuantity={parseFloat(order.plannedQuantity)}
        unitOfMeasure={order.recipe.unitOfMeasure}
        onSuccess={fetchOrder}
      />

      <FinalizeCostsDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
        orderId={orderId}
        materialCost={parseFloat(order.materialCost)}
        onSuccess={fetchOrder}
      />
    </div>
  );
}
