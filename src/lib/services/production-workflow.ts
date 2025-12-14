import { db } from '@/db/db';
import {
  productionOrder,
  productionRecipe,
  productionMaterial,
  materialInventory,
  materialInventoryMovement,
  productInventory,
  productInventoryMovement,
} from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
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

export interface ProductionOrderIngredient {
  materialId: string;
  materialInventoryId?: string; // If not provided, will auto-select first available
  quantity: number;
  unitOfMeasure: string;
  cost?: number; // Optional cost per unit for this material
}

export interface CreateProductionOrderInput {
  recipeId: string;
  locationId: string;
  plannedQuantity: number;
  scheduledDate?: Date;
  createdBy?: string;
  ingredients?: ProductionOrderIngredient[]; // Custom ingredients, overrides recipe if provided
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
  const {
    recipeId,
    locationId,
    plannedQuantity,
    scheduledDate,
    createdBy,
    ingredients: customIngredients,
  } = input;

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

  await db.transaction(async (tx) => {
    let outputProductInventoryId = null;
    let outputMaterialInventoryId = null;

    if (recipe.outputType === 'product' && recipe.outputProductId) {
      const prodInv = await tx.query.productInventory.findFirst({
        where: and(
          eq(productInventory.productId, recipe.outputProductId),
          eq(productInventory.locationId, locationId)
        ),
      });
      if (!prodInv) {
        throw new ProductionWorkflowError(
          `Product inventory not found for product ${recipe.outputProductId} at location ${locationId}. Please create product inventory first.`
        );
      }
      outputProductInventoryId = prodInv.id;
    } else if (recipe.outputType === 'material' && recipe.outputMaterialId) {
      const matInv = await tx.query.materialInventory.findFirst({
        where: and(
          eq(materialInventory.materialId, recipe.outputMaterialId),
          eq(materialInventory.locationId, locationId)
        ),
      });
      if (!matInv) {
        throw new ProductionWorkflowError(
          `Material inventory not found for material ${recipe.outputMaterialId} at location ${locationId}. Please create material inventory first.`
        );
      }
      outputMaterialInventoryId = matInv.id;
    }

    await tx.insert(productionOrder).values({
      id: orderId,
      recipeId,
      locationId,
      plannedQuantity: plannedQuantity.toString(),
      status: 'draft',
      outputType: recipe.outputType,
      outputProductInventoryId,
      outputMaterialInventoryId,
      scheduledDate: scheduledDate || null,
      materialCost: '0.00',
      laborCost: '0.00',
      overheadCost: '0.00',
      totalCost: '0.00',
      createdBy: createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Use custom ingredients if provided, otherwise use recipe ingredients as template
    const ingredientsToUse = customIngredients || [];

    // If no custom ingredients, scale recipe ingredients
    if (!customIngredients && recipe.ingredients && recipe.ingredients.length > 0) {
      for (const ingredient of recipe.ingredients) {
        const scaledQuantity = Number(ingredient.quantity) * scalingFactor;
        ingredientsToUse.push({
          materialId: ingredient.materialId,
          quantity: scaledQuantity,
          unitOfMeasure: ingredient.unitOfMeasure,
        });
      }
    }

    if (ingredientsToUse.length > 0) {
      const productionMaterialsData = [];

      for (const ingredient of ingredientsToUse) {
        let matInv;

        // If materialInventoryId is specified, use it
        if (ingredient.materialInventoryId) {
          matInv = await tx.query.materialInventory.findFirst({
            where: eq(materialInventory.id, ingredient.materialInventoryId),
          });

          if (!matInv) {
            throw new ProductionWorkflowError(
              `Material inventory ${ingredient.materialInventoryId} not found.`
            );
          }

          // Verify it matches the material and location
          if (matInv.materialId !== ingredient.materialId || matInv.locationId !== locationId) {
            throw new ProductionWorkflowError(
              `Material inventory ${ingredient.materialInventoryId} does not match material ${ingredient.materialId} at location ${locationId}.`
            );
          }
        } else {
          // Auto-select first available material inventory at this location
          matInv = await tx.query.materialInventory.findFirst({
            where: and(
              eq(materialInventory.materialId, ingredient.materialId),
              eq(materialInventory.locationId, locationId)
            ),
          });

          if (!matInv) {
            throw new ProductionWorkflowError(
              `Material inventory not found for material ${ingredient.materialId} at location ${locationId}. Please create material inventory first.`
            );
          }
        }

        productionMaterialsData.push({
          id: `prod_mat_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          productionOrderId: orderId,
          materialId: ingredient.materialId,
          materialInventoryId: matInv.id,
          plannedQuantity: ingredient.quantity.toFixed(2),
          unitOfMeasure: ingredient.unitOfMeasure,
          unitCost: ingredient.cost ? ingredient.cost.toFixed(2) : null,
          totalCost: ingredient.cost ? (ingredient.cost * ingredient.quantity).toFixed(2) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await tx.insert(productionMaterial).values(productionMaterialsData);
    }
  });

  return orderId;
}

export async function checkMaterialAvailability(
  orderId: string
): Promise<MaterialAvailability[]> {
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
    // Get the material inventory
    const matInventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, material.materialInventoryId),
      with: {
        material: true,
      },
    });

    if (!matInventory) {
      availabilityChecks.push({
        materialId: material.materialInventoryId,
        required: Number(material.plannedQuantity),
        available: 0,
        sufficient: false,
        unitOfMeasure: material.unitOfMeasure,
      });
      continue;
    }

    const stockLevel = await getMaterialCurrentStock(matInventory.id);
    const available = stockLevel ? stockLevel.currentStock : 0;
    const required = Number(material.plannedQuantity);

    availabilityChecks.push({
      materialId: matInventory.materialId,
      required,
      available,
      sufficient: available >= required,
      unitOfMeasure: material.unitOfMeasure,
    });
  }

  return availabilityChecks;
}

export async function schedule(
  orderId: string,
  scheduledDate?: Date
): Promise<void> {
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  validateStateTransition(order.status as ProductionOrderStatus, 'scheduled');

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

  await db
    .update(productionOrder)
    .set({
      status: 'scheduled',
      scheduledDate: scheduledDate || order.scheduledDate,
      updatedAt: new Date(),
    })
    .where(eq(productionOrder.id, orderId));
}

export async function startProduction(
  input: StartProductionInput
): Promise<void> {
  const { orderId, startedBy } = input;

  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
    with: {
      materials: true,
    },
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  validateStateTransition(order.status as ProductionOrderStatus, 'in_progress');

  const availability = await checkMaterialAvailability(orderId);
  const insufficientMaterials = availability.filter((m) => !m.sufficient);

  if (insufficientMaterials.length > 0) {
    throw new ProductionWorkflowError(
      'Insufficient materials to start production'
    );
  }

  await db.transaction(async (tx) => {
    let totalMaterialCost = 0;

    for (const material of order.materials || []) {
      // Get material inventory to capture unit cost
      const matInv = await tx.query.materialInventory.findFirst({
        where: eq(materialInventory.id, material.materialInventoryId),
      });

      if (!matInv) {
        throw new ProductionWorkflowError(
          `Material inventory ${material.materialInventoryId} not found`
        );
      }

      // Try to get unit cost from inventory cost field, or from latest purchase movement
      let unitCost = Number(matInv.cost || 0);

      if (unitCost === 0) {
        // Fallback: get the most recent purchase price from movements
        const latestPurchase = await tx.query.materialInventoryMovement.findFirst({
          where: and(
            eq(materialInventoryMovement.materialInventoryId, material.materialInventoryId),
            eq(materialInventoryMovement.type, 'purchase')
          ),
          orderBy: [desc(materialInventoryMovement.date)],
        });

        if (latestPurchase?.unitPrice) {
          unitCost = Number(latestPurchase.unitPrice);
        }
      }
      const quantity = Number(material.plannedQuantity);
      const totalCost = unitCost * quantity;
      totalMaterialCost += totalCost;

      // Material already has the materialInventoryId from creation
      const movementId = `mat_mov_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      await tx.insert(materialInventoryMovement).values({
        id: movementId,
        materialInventoryId: material.materialInventoryId,
        type: 'production_consumption',
        quantity: material.plannedQuantity,
        unitPrice: unitCost.toFixed(2),
        date: new Date(),
        remarks: `Production order ${orderId}`,
        referenceType: 'production_order',
        referenceId: orderId,
        createdBy: startedBy || null,
        createdAt: new Date(),
      });

      await tx
        .update(productionMaterial)
        .set({
          actualQuantity: material.plannedQuantity,
          unitCost: unitCost.toFixed(2),
          totalCost: totalCost.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(productionMaterial.id, material.id));
    }

    await tx
      .update(productionOrder)
      .set({
        status: 'in_progress',
        materialCost: totalMaterialCost.toFixed(2),
        startedAt: new Date(),
        updatedBy: startedBy || null,
        updatedAt: new Date(),
      })
      .where(eq(productionOrder.id, orderId));
  });
}

export async function completeProduction(
  input: CompleteProductionInput
): Promise<void> {
  const { orderId, actualQuantity, completedBy } = input;

  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  validateStateTransition(order.status as ProductionOrderStatus, 'completed');

  await db.transaction(async (tx) => {
    if (order.outputType === 'product' && order.outputProductInventoryId) {
      const invMovementId = `inv_mov_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      await tx.insert(productInventoryMovement).values({
        id: invMovementId,
        productInventoryId: order.outputProductInventoryId,
        type: 'production_output',
        quantity: actualQuantity.toString(),
        date: new Date(),
        remarks: `Production order ${orderId}`,
        referenceType: 'production_order',
        referenceId: orderId,
        createdBy: completedBy || null,
        createdAt: new Date(),
      });
    } else if (
      order.outputType === 'material' &&
      order.outputMaterialInventoryId
    ) {
      const matMovementId = `mat_mov_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      await tx.insert(materialInventoryMovement).values({
        id: matMovementId,
        materialInventoryId: order.outputMaterialInventoryId,
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

export async function finalizeCosts(
  input: FinalizeCostsInput
): Promise<ProductionCosts> {
  const { orderId, laborCost = 0, overheadCost = 0, finalizedBy } = input;

  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  validateStateTransition(
    order.status as ProductionOrderStatus,
    'costing_done'
  );

  const costBreakdown = await calculateFullCost(
    orderId,
    laborCost,
    overheadCost
  );
  const priceResult = await calculateSuggestedPrice(orderId, 30); // 30% profit margin

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

export async function cancel(
  orderId: string,
  cancelledBy?: string
): Promise<void> {
  const order = await db.query.productionOrder.findFirst({
    where: eq(productionOrder.id, orderId),
    with: {
      materials: true,
    },
  });

  if (!order) {
    throw new ProductionWorkflowError(`Production order ${orderId} not found`);
  }

  validateStateTransition(order.status as ProductionOrderStatus, 'cancelled');

  await db.transaction(async (tx) => {
    if (order.status === 'in_progress') {
      for (const material of order.materials || []) {
        if (material.actualQuantity) {
          // Material already has the materialInventoryId
          const movementId = `mat_mov_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          await tx.insert(materialInventoryMovement).values({
            id: movementId,
            materialInventoryId: material.materialInventoryId,
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
