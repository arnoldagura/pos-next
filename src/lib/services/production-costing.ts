import { db } from '@/db/db';
import {
  productionOrder,
  productionRecipe,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// Types
export interface MaterialCostBreakdown {
  materialId: string;
  materialName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitOfMeasure: string;
}

export interface FullCostBreakdown {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  quantity: number;
  materialBreakdown: MaterialCostBreakdown[];
}

export interface SuggestedPriceResult {
  unitCost: number;
  profitMargin: number;
  profitAmount: number;
  suggestedPrice: number;
}

export interface ProductionCostEstimate {
  estimatedMaterialCost: number;
  estimatedLaborCost: number;
  estimatedOverheadCost: number;
  estimatedTotalCost: number;
  estimatedUnitCost: number;
  materialBreakdown: MaterialCostBreakdown[];
}

export interface BatchCostComparison {
  quantity: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  costSavingsVsSmallest?: number;
  costSavingsPercentage?: number;
}

export interface BatchCostAnalysisResult {
  batches: BatchCostComparison[];
  recommendedBatchSize?: number;
  optimalUnitCost?: number;
}

// Errors
export class ProductionCostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionCostingError';
  }
}

/**
 * Calculate the total material cost for a production order
 * Sums up the cost of all consumed materials
 *
 * @param orderId - Production order ID
 * @returns Material cost breakdown and total
 */
export async function calculateMaterialCost(
  orderId: string
): Promise<{ totalCost: number; breakdown: MaterialCostBreakdown[] }> {
  // Get production order with materials
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
    with: {
      materials: {
        with: {
          material: true,
        },
      },
    },
  });

  if (!order) {
    throw new ProductionCostingError(`Production order ${orderId} not found`);
  }

  const breakdown: MaterialCostBreakdown[] = [];
  let totalCost = 0;

  // Calculate cost for each material
  for (const prodMaterial of order.materials || []) {
    const quantity = Number(prodMaterial.actualQuantity || prodMaterial.plannedQuantity);
    const unitCost = Number(prodMaterial.unitCost || prodMaterial.material?.defaultCost || 0);
    const materialTotalCost = quantity * unitCost;

    breakdown.push({
      materialId: prodMaterial.materialId,
      materialName: prodMaterial.material?.name,
      quantity,
      unitCost,
      totalCost: materialTotalCost,
      unitOfMeasure: prodMaterial.unitOfMeasure,
    });

    totalCost += materialTotalCost;
  }

  return {
    totalCost,
    breakdown,
  };
}

/**
 * Calculate the full cost of production including material, labor, and overhead
 *
 * @param orderId - Production order ID
 * @param laborCost - Labor cost (optional, defaults to order's labor cost)
 * @param overheadCost - Overhead cost (optional, defaults to order's overhead cost)
 * @returns Complete cost breakdown
 */
export async function calculateFullCost(
  orderId: string,
  laborCost?: number,
  overheadCost?: number
): Promise<FullCostBreakdown> {
  // Get production order
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionCostingError(`Production order ${orderId} not found`);
  }

  // Calculate material cost
  const materialCostResult = await calculateMaterialCost(orderId);

  // Use provided costs or fall back to order costs
  const finalLaborCost = laborCost !== undefined ? laborCost : Number(order.laborCost || 0);
  const finalOverheadCost = overheadCost !== undefined ? overheadCost : Number(order.overheadCost || 0);

  // Calculate totals
  const totalCost = materialCostResult.totalCost + finalLaborCost + finalOverheadCost;
  const quantity = Number(order.actualQuantity || order.plannedQuantity);
  const unitCost = quantity > 0 ? totalCost / quantity : 0;

  return {
    materialCost: materialCostResult.totalCost,
    laborCost: finalLaborCost,
    overheadCost: finalOverheadCost,
    totalCost,
    unitCost,
    quantity,
    materialBreakdown: materialCostResult.breakdown,
  };
}

/**
 * Calculate suggested selling price with profit margin
 *
 * @param orderId - Production order ID
 * @param profitMarginPercent - Desired profit margin as percentage (e.g., 30 for 30%)
 * @returns Suggested price calculation
 */
export async function calculateSuggestedPrice(
  orderId: string,
  profitMarginPercent: number = 30
): Promise<SuggestedPriceResult> {
  if (profitMarginPercent < 0) {
    throw new ProductionCostingError('Profit margin cannot be negative');
  }

  // Calculate full cost
  const costBreakdown = await calculateFullCost(orderId);

  // Calculate profit and suggested price
  const profitAmount = costBreakdown.unitCost * (profitMarginPercent / 100);
  const suggestedPrice = costBreakdown.unitCost + profitAmount;

  return {
    unitCost: costBreakdown.unitCost,
    profitMargin: profitMarginPercent,
    profitAmount,
    suggestedPrice,
  };
}

/**
 * Estimate production cost before creating a production order
 * Useful for planning and decision-making
 *
 * @param recipeId - Production recipe ID
 * @param quantity - Planned production quantity
 * @param laborCostEstimate - Estimated labor cost (optional)
 * @param overheadCostEstimate - Estimated overhead cost (optional)
 * @returns Cost estimate
 */
export async function estimateProductionCost(
  recipeId: string,
  quantity: number,
  laborCostEstimate: number = 0,
  overheadCostEstimate: number = 0
): Promise<ProductionCostEstimate> {
  if (quantity <= 0) {
    throw new ProductionCostingError('Quantity must be greater than zero');
  }

  // Get recipe with ingredients
  const recipe = await db.query.productionRecipe.findFirst({
    where: eq(productionRecipe.id, recipeId),
    with: {
      ingredients: {
        with: {
          material: true,
        },
      },
    },
  });

  if (!recipe) {
    throw new ProductionCostingError(`Production recipe ${recipeId} not found`);
  }

  // Calculate scaling factor
  const scalingFactor = quantity / Number(recipe.outputQuantity);

  // Calculate material costs
  const materialBreakdown: MaterialCostBreakdown[] = [];
  let totalMaterialCost = 0;

  for (const ingredient of recipe.ingredients || []) {
    const scaledQuantity = Number(ingredient.quantity) * scalingFactor;
    const unitCost = Number(ingredient.material?.defaultCost || 0);
    const totalCost = scaledQuantity * unitCost;

    materialBreakdown.push({
      materialId: ingredient.materialId,
      materialName: ingredient.material?.name,
      quantity: scaledQuantity,
      unitCost,
      totalCost,
      unitOfMeasure: ingredient.unitOfMeasure,
    });

    totalMaterialCost += totalCost;
  }

  // Calculate totals
  const estimatedTotalCost = totalMaterialCost + laborCostEstimate + overheadCostEstimate;
  const estimatedUnitCost = quantity > 0 ? estimatedTotalCost / quantity : 0;

  return {
    estimatedMaterialCost: totalMaterialCost,
    estimatedLaborCost: laborCostEstimate,
    estimatedOverheadCost: overheadCostEstimate,
    estimatedTotalCost,
    estimatedUnitCost,
    materialBreakdown,
  };
}

/**
 * Compare costs at different batch quantities
 * Helps determine optimal production batch size considering economies of scale
 *
 * @param recipeId - Production recipe ID
 * @param quantities - Array of batch quantities to compare
 * @param laborCostCalculator - Function to calculate labor cost for given quantity
 * @param overheadCostCalculator - Function to calculate overhead cost for given quantity
 * @returns Batch cost analysis with comparisons
 */
export async function batchCostAnalysis(
  recipeId: string,
  quantities: number[],
  laborCostCalculator?: (quantity: number) => number,
  overheadCostCalculator?: (quantity: number) => number
): Promise<BatchCostAnalysisResult> {
  if (quantities.length === 0) {
    throw new ProductionCostingError('At least one quantity must be provided');
  }

  if (quantities.some(q => q <= 0)) {
    throw new ProductionCostingError('All quantities must be greater than zero');
  }

  // Sort quantities for easier comparison
  const sortedQuantities = [...quantities].sort((a, b) => a - b);

  // Calculate costs for each batch size
  const batches: BatchCostComparison[] = [];

  for (const quantity of sortedQuantities) {
    // Calculate labor and overhead costs
    const laborCost = laborCostCalculator ? laborCostCalculator(quantity) : 0;
    const overheadCost = overheadCostCalculator ? overheadCostCalculator(quantity) : 0;

    // Get cost estimate
    const estimate = await estimateProductionCost(
      recipeId,
      quantity,
      laborCost,
      overheadCost
    );

    batches.push({
      quantity,
      materialCost: estimate.estimatedMaterialCost,
      laborCost: estimate.estimatedLaborCost,
      overheadCost: estimate.estimatedOverheadCost,
      totalCost: estimate.estimatedTotalCost,
      unitCost: estimate.estimatedUnitCost,
    });
  }

  // Calculate savings compared to smallest batch
  const smallestBatchUnitCost = batches[0].unitCost;

  for (let i = 1; i < batches.length; i++) {
    const savings = smallestBatchUnitCost - batches[i].unitCost;
    const savingsPercentage = smallestBatchUnitCost > 0
      ? (savings / smallestBatchUnitCost) * 100
      : 0;

    batches[i].costSavingsVsSmallest = savings;
    batches[i].costSavingsPercentage = savingsPercentage;
  }

  // Find optimal batch size (lowest unit cost)
  const optimalBatch = batches.reduce((min, batch) =>
    batch.unitCost < min.unitCost ? batch : min
  , batches[0]);

  return {
    batches,
    recommendedBatchSize: optimalBatch.quantity,
    optimalUnitCost: optimalBatch.unitCost,
  };
}
