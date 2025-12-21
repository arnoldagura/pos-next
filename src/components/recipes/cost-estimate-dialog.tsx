'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calculator, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Material = {
  id: string;
  name: string;
  unitOfMeasure: string;
  defaultCost: string | null;
};

type RecipeIngredient = {
  id: string;
  materialId: string;
  quantity: string;
  unitOfMeasure: string;
  material: Material;
};

type Recipe = {
  id: string;
  name: string;
  description: string | null;
  outputQuantity: string;
  unitOfMeasure: string;
  ingredients: RecipeIngredient[];
};

type MaterialCostBreakdown = {
  materialId: string;
  materialName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitOfMeasure: string;
};

type CostEstimate = {
  estimatedMaterialCost: number;
  estimatedLaborCost: number;
  estimatedOverheadCost: number;
  estimatedTotalCost: number;
  estimatedUnitCost: number;
  materialBreakdown: MaterialCostBreakdown[];
};

interface CostEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
}

export function CostEstimateDialog({
  open,
  onOpenChange,
  recipe,
}: CostEstimateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);

  useEffect(() => {
    if (open) {
      // Set default quantity to recipe output quantity
      setQuantity(recipe.outputQuantity);
      setLaborCost('0');
      setOverheadCost('0');
      setEstimate(null);
    }
  }, [open, recipe]);

  const handleCalculate = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/recipes/${recipe.id}/estimate-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseFloat(quantity),
          laborCost: parseFloat(laborCost) || 0,
          overheadCost: parseFloat(overheadCost) || 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate cost estimate');
      }

      const data = await response.json();
      setEstimate(data);
    } catch (error) {
      toast.error('Failed to calculate cost estimate');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Cost Estimate - {recipe.name}</DialogTitle>
        </DialogHeader>

        <div className='space-y-6 mt-4'>
          {/* Input Parameters */}
          <div className='grid grid-cols-3 gap-4'>
            <div>
              <Label htmlFor='quantity'>Production Quantity *</Label>
              <Input
                id='quantity'
                type='number'
                step='0.01'
                min='0.01'
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Default: ${recipe.outputQuantity} ${recipe.unitOfMeasure}`}
              />
              <p className='text-xs text-gray-500 mt-1'>
                Base recipe yield: {recipe.outputQuantity}{' '}
                {recipe.unitOfMeasure}
              </p>
            </div>
            <div>
              <Label htmlFor='laborCost'>Estimated Labor Cost</Label>
              <Input
                id='laborCost'
                type='number'
                step='0.01'
                min='0'
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                placeholder='0.00'
              />
            </div>
            <div>
              <Label htmlFor='overheadCost'>Estimated Overhead Cost</Label>
              <Input
                id='overheadCost'
                type='number'
                step='0.01'
                min='0'
                value={overheadCost}
                onChange={(e) => setOverheadCost(e.target.value)}
                placeholder='0.00'
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading}
            className='w-full'
          >
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className='h-4 w-4 mr-2' />
                Calculate Cost Estimate
              </>
            )}
          </Button>

          {/* Cost Estimate Results */}
          {estimate && (
            <div className='space-y-6 pt-6 border-t'>
              {/* Cost Summary */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='text-sm text-blue-600 font-medium'>
                    Material Cost
                  </div>
                  <div className='text-2xl font-bold text-blue-900 mt-1'>
                    {formatCurrency(estimate.estimatedMaterialCost)}
                  </div>
                </div>

                <div className='p-4 bg-green-50 rounded-lg border border-green-200'>
                  <div className='text-sm text-green-600 font-medium'>
                    Unit Cost
                  </div>
                  <div className='text-2xl font-bold text-green-900 mt-1'>
                    {formatCurrency(estimate.estimatedUnitCost)}
                  </div>
                  <div className='text-xs text-green-600 mt-1'>
                    per {recipe.unitOfMeasure}
                  </div>
                </div>

                <div className='p-4  rounded-lg border border-gray-200'>
                  <div className='text-sm text-gray-600 font-medium'>
                    Labor Cost
                  </div>
                  <div className='text-xl font-bold text-gray-900 mt-1'>
                    {formatCurrency(estimate.estimatedLaborCost)}
                  </div>
                </div>

                <div className='p-4  rounded-lg border border-gray-200'>
                  <div className='text-sm text-gray-600 font-medium'>
                    Overhead Cost
                  </div>
                  <div className='text-xl font-bold text-gray-900 mt-1'>
                    {formatCurrency(estimate.estimatedOverheadCost)}
                  </div>
                </div>
              </div>

              <div className='p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200'>
                <div className='text-sm text-purple-600 font-medium'>
                  Total Estimated Cost
                </div>
                <div className='text-3xl font-bold text-purple-900 mt-2'>
                  {formatCurrency(estimate.estimatedTotalCost)}
                </div>
                <div className='text-sm text-purple-600 mt-1'>
                  For {quantity} {recipe.unitOfMeasure}
                </div>
              </div>

              {/* Material Breakdown */}
              <div>
                <h3 className='text-lg font-medium mb-3'>
                  Material Cost Breakdown
                </h3>
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className='text-right'>Quantity</TableHead>
                        <TableHead className='text-right'>Unit Cost</TableHead>
                        <TableHead className='text-right'>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estimate.materialBreakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className='font-medium'>
                            {item.materialName || item.materialId}
                          </TableCell>
                          <TableCell className='text-right'>
                            {item.quantity.toFixed(2)} {item.unitOfMeasure}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatCurrency(item.unitCost)}
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            {formatCurrency(item.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className=' font-medium'>
                        <TableCell colSpan={3}>Total Material Cost</TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(estimate.estimatedMaterialCost)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Cost Distribution Chart */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Cost Distribution</h3>
                <div className='space-y-2'>
                  {estimate.estimatedMaterialCost > 0 && (
                    <div className='flex items-center gap-3'>
                      <div className='w-24 text-sm text-gray-600'>
                        Materials
                      </div>
                      <div className='flex-1 bg-gray-200 rounded-full h-6 overflow-hidden'>
                        <div
                          className='bg-blue-500 h-full flex items-center justify-end pr-2 text-white text-xs font-medium'
                          style={{
                            width: `${
                              (estimate.estimatedMaterialCost /
                                estimate.estimatedTotalCost) *
                              100
                            }%`,
                          }}
                        >
                          {(
                            (estimate.estimatedMaterialCost /
                              estimate.estimatedTotalCost) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                      <div className='w-24 text-sm text-right font-medium'>
                        {formatCurrency(estimate.estimatedMaterialCost)}
                      </div>
                    </div>
                  )}
                  {estimate.estimatedLaborCost > 0 && (
                    <div className='flex items-center gap-3'>
                      <div className='w-24 text-sm text-gray-600'>Labor</div>
                      <div className='flex-1 bg-gray-200 rounded-full h-6 overflow-hidden'>
                        <div
                          className='bg-green-500 h-full flex items-center justify-end pr-2 text-white text-xs font-medium'
                          style={{
                            width: `${
                              (estimate.estimatedLaborCost /
                                estimate.estimatedTotalCost) *
                              100
                            }%`,
                          }}
                        >
                          {(
                            (estimate.estimatedLaborCost /
                              estimate.estimatedTotalCost) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                      <div className='w-24 text-sm text-right font-medium'>
                        {formatCurrency(estimate.estimatedLaborCost)}
                      </div>
                    </div>
                  )}
                  {estimate.estimatedOverheadCost > 0 && (
                    <div className='flex items-center gap-3'>
                      <div className='w-24 text-sm text-gray-600'>Overhead</div>
                      <div className='flex-1 bg-gray-200 rounded-full h-6 overflow-hidden'>
                        <div
                          className='bg-purple-500 h-full flex items-center justify-end pr-2 text-white text-xs font-medium'
                          style={{
                            width: `${
                              (estimate.estimatedOverheadCost /
                                estimate.estimatedTotalCost) *
                              100
                            }%`,
                          }}
                        >
                          {(
                            (estimate.estimatedOverheadCost /
                              estimate.estimatedTotalCost) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                      <div className='w-24 text-sm text-right font-medium'>
                        {formatCurrency(estimate.estimatedOverheadCost)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end pt-4 border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
