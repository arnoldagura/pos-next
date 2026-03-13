import { db } from '@/db/db';
import { productionRecipe, productionRecipeIngredient } from '@/drizzle/schema';
import { requireTenantId } from '@/lib/tenant-context';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/recipes/[id]/duplicate - Duplicate a recipe
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const originalRecipe = await db.query.productionRecipe.findFirst({
      where: and(eq(productionRecipe.organizationId, tenantId), eq(productionRecipe.id, id)),
      with: {
        ingredients: true,
      },
    });

    if (!originalRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const newRecipeId = `recipe_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    await db.transaction(async (tx) => {
      await tx.insert(productionRecipe).values({
        id: newRecipeId,
        organizationId: tenantId,
        name: `${originalRecipe.name} (Copy)`,
        description: originalRecipe.description,
        outputType: originalRecipe.outputType,
        outputProductId: originalRecipe.outputProductId,
        outputMaterialId: originalRecipe.outputMaterialId,
        outputQuantity: originalRecipe.outputQuantity,
        unitOfMeasure: originalRecipe.unitOfMeasure,
        status: true,
        createdBy: originalRecipe.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (originalRecipe.ingredients && originalRecipe.ingredients.length > 0) {
        const ingredientValues = originalRecipe.ingredients.map(
          (ingredient) => ({
            id: `recipe_ing_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            recipeId: newRecipeId,
            materialId: ingredient.materialId,
            quantity: ingredient.quantity,
            unitOfMeasure: ingredient.unitOfMeasure,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        await tx.insert(productionRecipeIngredient).values(ingredientValues);
      }
    });

    const duplicatedRecipe = await db.query.productionRecipe.findFirst({
      where: eq(productionRecipe.id, newRecipeId),
      with: {
        outputProduct: true,
        outputMaterial: true,
        ingredients: {
          with: {
            material: true,
          },
        },
      },
    });

    return NextResponse.json(duplicatedRecipe, { status: 201 });
  } catch (error) {
    console.error('Error duplicating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate recipe' },
      { status: 500 }
    );
  }
}
