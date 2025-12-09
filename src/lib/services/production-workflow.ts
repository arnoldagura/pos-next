import { db } from '@/db/db';
import {
  productionOrder,
  productionRecipe,
  productionMaterial,
  materialInventory,
  materialInventoryMovement,
  inventory,
  inventoryMovement,
} from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getMaterialCurrentStock } from './material-inventory-calculation';
import {
  calculateFullCost,
  calculateSuggestedPrice,
} from './production-costing';

// Types
export type ProductionOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'costing_done'
  | 'cancelled';

export interface CreateProductionOrderInput {
  recipeId: string;
  locationId: string;
  plannedQuantity: number;
  scheduledDate?: Date;
  createdBy?: string;
}

export interface MaterialAvailability {
  materialId: string;
  required: number;
  available: number;
  sufficient: boolean;
  unitOfMeasure: string;
}

export interface ProductionCosts {
  materialCost: number;
  laborCost?: number;
  overheadCost?: number;
  totalCost: number;
  unitCost: number;
}

export interface StartProductionInput {
  orderId: string;
  startedBy?: string;
}

export interface CompleteProductionInput {
  orderId: string;
  actualQuantity: number;
  completedBy?: string;
}

export interface FinalizeCostsInput {
  orderId: string;
  laborCost?: number;
  overheadCost?: number;
  finalizedBy?: string;
}

// State machine transitions
const VALID_TRANSITIONS: Record<
  ProductionOrderStatus,
  ProductionOrderStatus[]
> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['costing_done'],
  costing_done: [],
  cancelled: [],
};

// Errors
export class ProductionWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionWorkflowError';
  }
}

// State machine validation
export function validateStateTransition(
  currentStatus: ProductionOrderStatus,
  newStatus: ProductionOrderStatus
): void {
  const validNextStates = VALID_TRANSITIONS[currentStatus];
  if (!validNextStates.includes(newStatus)) {
    throw new ProductionWorkflowError(
      `Invalid state transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validNextStates.join(
        ', '
      )}`
    );
  }
}

// Create production order from recipe
export async function createFromRecipe(
  input: CreateProductionOrderInput
): Promise<string> {
  const { recipeId, locationId, plannedQuantity, scheduledDate, createdBy } =
    input;

  // Fetch recipe with ingredients
  const recipe = await db.query.productionRecipe.findFirst({
    where: eq(productionRecipe.id, recipeId),
    with: {
      ingredients: true,
    },
  });

  if (!recipe) {
    throw new ProductionWorkflowError(`Recipe ${recipeId} not found`);
  }

  if (!recipe.status) {
    throw new ProductionWorkflowError(`Recipe ${recipeId} is inactive`);
  }

  // Calculate scaling factor
  const scalingFactor = plannedQuantity / Number(recipe.outputQuantity);

  // Generate order ID
  const orderId = `prod_order_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  // Create production order
  await db.transaction(async (tx) => {
    // Insert production order
    await tx.insert(productionOrder).values({
      id: orderId,
      recipeId,
      locationId,
      plannedQuantity: plannedQuantity.toString(),
      status: 'draft',
      outputType: recipe.outputType,
      outputProductId: recipe.outputProductId,
      outputMaterialId: recipe.outputMaterialId,
      scheduledDate: scheduledDate || null,
      materialCost: '0.00',
      laborCost: '0.00',
      overheadCost: '0.00',
      totalCost: '0.00',
      createdBy: createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert production materials with scaled quantities
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const productionMaterialsData = recipe.ingredients.map((ingredient) => {
        const scaledQuantity = Number(ingredient.quantity) * scalingFactor;
        return {
          id: `prod_mat_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          productionOrderId: orderId,
          materialId: ingredient.materialId,
          plannedQuantity: scaledQuantity.toFixed(2),
          unitOfMeasure: ingredient.unitOfMeasure,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await tx.insert(productionMaterial).values(productionMaterialsData);
    }
  });

  return orderId;
}

// Check material availability
export async function checkMaterialAvailability(
  orderId: string
): Promise<MaterialAvailability[]> {
  // Get production order with materials
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
    with: {
      materials: true,
    },
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  if (!order.materials || order.materials.length === 0) {
    return [];
  }

  const availabilityChecks: MaterialAvailability[] = [];

  for (const material of order.materials) {
    // Get material inventory for this location
    const matInventory = await db.query.materialInventory.findFirst({
      where: and(
        eq(materialInventory.materialId, material.materialId),
        eq(materialInventory.locationId, order.locationId)
      ),
    });

    if (!matInventory) {
      availabilityChecks.push({
        materialId: material.materialId,
        required: Number(material.plannedQuantity),
        available: 0,
        sufficient: false,
        unitOfMeasure: material.unitOfMeasure,
      });
      continue;
    }

    // Get current stock
    const stockLevel = await getMaterialCurrentStock(matInventory.id);
    const available = stockLevel ? stockLevel.currentStock : 0;
    const required = Number(material.plannedQuantity);

    availabilityChecks.push({
      materialId: material.materialId,
      required,
      available,
      sufficient: available >= required,
      unitOfMeasure: material.unitOfMeasure,
    });
  }

  return availabilityChecks;
}

// Schedule production order
export async function schedule(
  orderId: string,
  scheduledDate?: Date
): Promise<void> {
  // Get current order
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  // Validate state transition
  validateStateTransition(order.status as ProductionOrderStatus, 'scheduled');

  // Check material availability
  const availability = await checkMaterialAvailability(orderId);
  const insufficientMaterials = availability.filter((m) => !m.sufficient);

  if (insufficientMaterials.length > 0) {
    const materialList = insufficientMaterials
      .map((m) => `${m.materialId} (need: ${m.required}, have: ${m.available})`)
      .join(', ');
    throw new ProductionWorkflowError(
      `Insufficient materials for production: ${materialList}`
    );
  }

  // Update to scheduled
  await db
    .update(productionOrder)
    .set({
      status: 'scheduled',
      scheduledDate: scheduledDate || order.scheduledDate,
      updatedAt: new Date(),
    })
    .where(eq(productionOrder.id, orderId));
}

// Start production
export async function startProduction(
  input: StartProductionInput
): Promise<void> {
  const { orderId, startedBy } = input;

  // Get current order with materials
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
    with: {
      materials: true,
    },
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  // Validate state transition
  validateStateTransition(order.status as ProductionOrderStatus, 'in_progress');

  // Check material availability one more time
  const availability = await checkMaterialAvailability(orderId);
  const insufficientMaterials = availability.filter((m) => !m.sufficient);

  if (insufficientMaterials.length > 0) {
    throw new ProductionWorkflowError(
      'Insufficient materials to start production'
    );
  }

  // Consume materials
  await db.transaction(async (tx) => {
    for (const material of order.materials || []) {
      // Get material inventory
      const matInventory = await tx.query.materialInventory.findFirst({
        where: and(
          eq(materialInventory.materialId, material.materialId),
          eq(materialInventory.locationId, order.locationId)
        ),
      });

      if (!matInventory) {
        throw new ProductionWorkflowError(
          `Material inventory not found for material ${material.materialId}`
        );
      }

      // Create consumption movement
      const movementId = `mat_mov_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      await tx.insert(materialInventoryMovement).values({
        id: movementId,
        materialInventoryId: matInventory.id,
        type: 'production_consumption',
        quantity: material.plannedQuantity,
        date: new Date(),
        remarks: `Production order ${orderId}`,
        referenceType: 'production_order',
        referenceId: orderId,
        createdBy: startedBy || null,
        createdAt: new Date(),
      });

      // Update production material with actual quantity consumed
      await tx
        .update(productionMaterial)
        .set({
          actualQuantity: material.plannedQuantity,
          updatedAt: new Date(),
        })
        .where(eq(productionMaterial.id, material.id));
    }

    // Update order status
    await tx
      .update(productionOrder)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
        updatedBy: startedBy || null,
        updatedAt: new Date(),
      })
      .where(eq(productionOrder.id, orderId));
  });
}

// Complete production
export async function completeProduction(
  input: CompleteProductionInput
): Promise<void> {
  const { orderId, actualQuantity, completedBy } = input;

  // Get current order
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  // Validate state transition
  validateStateTransition(order.status as ProductionOrderStatus, 'completed');

  await db.transaction(async (tx) => {
    // Update inventory based on output type
    if (order.outputType === 'product' && order.outputProductId) {
      // Get or create product inventory
      const productInventory = await tx.query.inventory.findFirst({
        where: and(
          eq(inventory.productId, order.outputProductId),
          eq(inventory.locationId, order.locationId)
        ),
      });

      if (!productInventory) {
        throw new ProductionWorkflowError(
          `Product inventory not found for product ${order.outputProductId}`
        );
      }

      // Create inventory movement for produced items
      const invMovementId = `inv_mov_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      await tx.insert(inventoryMovement).values({
        id: invMovementId,
        inventoryId: productInventory.id,
        type: 'production_output',
        quantity: actualQuantity.toString(),
        date: new Date(),
        remarks: `Production order ${orderId}`,
        referenceType: 'production_order',
        referenceId: orderId,
        createdBy: completedBy || null,
        createdAt: new Date(),
      });
    } else if (order.outputType === 'material' && order.outputMaterialId) {
      // Get or create material inventory
      const matInventory = await tx.query.materialInventory.findFirst({
        where: and(
          eq(materialInventory.materialId, order.outputMaterialId),
          eq(materialInventory.locationId, order.locationId)
        ),
      });

      if (!matInventory) {
        throw new ProductionWorkflowError(
          `Material inventory not found for material ${order.outputMaterialId}`
        );
      }

      // Create material inventory movement for produced materials
      const matMovementId = `mat_mov_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      await tx.insert(materialInventoryMovement).values({
        id: matMovementId,
        materialInventoryId: matInventory.id,
        type: 'adjustment',
        quantity: actualQuantity.toString(),
        date: new Date(),
        remarks: `Production order ${orderId} - produced material`,
        referenceType: 'production_order',
        referenceId: orderId,
        createdBy: completedBy || null,
        createdAt: new Date(),
      });
    }

    // Update order
    await tx
      .update(productionOrder)
      .set({
        status: 'completed',
        actualQuantity: actualQuantity.toString(),
        completedAt: new Date(),
        updatedBy: completedBy || null,
        updatedAt: new Date(),
      })
      .where(eq(productionOrder.id, orderId));
  });
}

// Finalize costs
export async function finalizeCosts(
  input: FinalizeCostsInput
): Promise<ProductionCosts> {
  const { orderId, laborCost = 0, overheadCost = 0, finalizedBy } = input;

  // Get order
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  // Validate state transition
  validateStateTransition(
    order.status as ProductionOrderStatus,
    'costing_done'
  );

  // Use costing service to calculate costs
  const costBreakdown = await calculateFullCost(
    orderId,
    laborCost,
    overheadCost
  );
  const priceResult = await calculateSuggestedPrice(orderId, 30); // 30% profit margin

  // Update order with costs
  await db
    .update(productionOrder)
    .set({
      status: 'costing_done',
      materialCost: costBreakdown.materialCost.toFixed(2),
      laborCost: costBreakdown.laborCost.toFixed(2),
      overheadCost: costBreakdown.overheadCost.toFixed(2),
      totalCost: costBreakdown.totalCost.toFixed(2),
      unitCost: costBreakdown.unitCost.toFixed(2),
      suggestedPrice: priceResult.suggestedPrice.toFixed(2),
      updatedBy: finalizedBy || null,
      updatedAt: new Date(),
    })
    .where(eq(productionOrder.id, orderId));

  return {
    materialCost: costBreakdown.materialCost,
    laborCost: costBreakdown.laborCost,
    overheadCost: costBreakdown.overheadCost,
    totalCost: costBreakdown.totalCost,
    unitCost: costBreakdown.unitCost,
  };
}

// Cancel production order
export async function cancel(
  orderId: string,
  cancelledBy?: string
): Promise<void> {
  // Get current order with materials
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
    with: {
      materials: true,
    },
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  // Validate state transition
  validateStateTransition(order.status as ProductionOrderStatus, 'cancelled');

  await db.transaction(async (tx) => {
    // If production was in progress, reverse material consumption
    if (order.status === 'in_progress') {
      for (const material of order.materials || []) {
        if (material.actualQuantity) {
          // Get material inventory
          const matInventory = await tx.query.materialInventory.findFirst({
            where: and(
              eq(materialInventory.materialId, material.materialId),
              eq(materialInventory.locationId, order.locationId)
            ),
          });

          if (matInventory) {
            // Create reversal movement (adjustment to add back)
            const movementId = `mat_mov_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`;
            await tx.insert(materialInventoryMovement).values({
              id: movementId,
              materialInventoryId: matInventory.id,
              type: 'adjustment',
              quantity: material.actualQuantity,
              date: new Date(),
              remarks: `Reversal for cancelled production order ${orderId}`,
              referenceType: 'production_order',
              referenceId: orderId,
              createdBy: cancelledBy || null,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    // Update order status
    await tx
      .update(productionOrder)
      .set({
        status: 'cancelled',
        updatedBy: cancelledBy || null,
        updatedAt: new Date(),
      })
      .where(eq(productionOrder.id, orderId));
  });
}
