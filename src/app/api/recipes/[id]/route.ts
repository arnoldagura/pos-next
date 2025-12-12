import { db } from '@/db/db';
import { productionRecipe, productionRecipeIngredient } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateRecipeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  outputType: z.enum(['product', 'material']).optional(),
  outputProductId: z.string().optional(),
  outputMaterialId: z.string().optional(),
  outputQuantity: z
    .number()
    .positive('Output quantity must be positive')
    .optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required').optional(),
  ingredients: z
    .array(
      z.object({
        materialId: z.string().min(1, 'Material is required'),
        quantity: z.number().positive('Quantity must be positive'),
        unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
      })
    )
    .min(1, 'At least one ingredient is required')
    .optional(),
  updatedBy: z.string().optional(),
});

// GET /api/recipes/[id] - Get single recipe
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const recipe = await db.query.productionRecipe.findFirst({
      where: eq(productionRecipe.id, id),
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

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

// PUT /api/recipes/[id] - Update recipe
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateRecipeSchema.parse(body);

    const existingRecipe = await db.query.productionRecipe.findFirst({
      where: eq(productionRecipe.id, id),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (
      validatedData.outputType === 'product' &&
      !validatedData.outputProductId
    ) {
      return NextResponse.json(
        { error: 'Output product is required when output type is product' },
        { status: 400 }
      );
    }

    if (
      validatedData.outputType === 'material' &&
      !validatedData.outputMaterialId
    ) {
      return NextResponse.json(
        { error: 'Output material is required when output type is material' },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (validatedData.name) updateData.name = validatedData.name;
      if (validatedData.description !== undefined)
        updateData.description = validatedData.description;
      if (validatedData.outputType)
        updateData.outputType = validatedData.outputType;
      if (validatedData.outputProductId !== undefined)
        updateData.outputProductId = validatedData.outputProductId;
      if (validatedData.outputMaterialId !== undefined)
        updateData.outputMaterialId = validatedData.outputMaterialId;
      if (validatedData.outputQuantity)
        updateData.outputQuantity = validatedData.outputQuantity.toString();
      if (validatedData.unitOfMeasure)
        updateData.unitOfMeasure = validatedData.unitOfMeasure;
      if (validatedData.updatedBy)
        updateData.updatedBy = validatedData.updatedBy;

      await tx
        .update(productionRecipe)
        .set(updateData)
        .where(eq(productionRecipe.id, id));

      if (validatedData.ingredients) {
        await tx
          .delete(productionRecipeIngredient)
          .where(eq(productionRecipeIngredient.recipeId, id));

        const ingredientValues = validatedData.ingredients.map(
          (ingredient) => ({
            id: `recipe_ing_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            recipeId: id,
            materialId: ingredient.materialId,
            quantity: ingredient.quantity.toString(),
            unitOfMeasure: ingredient.unitOfMeasure,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        await tx.insert(productionRecipeIngredient).values(ingredientValues);
      }
    });

    const updatedRecipe = await db.query.productionRecipe.findFirst({
      where: eq(productionRecipe.id, id),
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

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

// DELETE /api/recipes/[id] - Deactivate recipe (soft delete)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existingRecipe = await db.query.productionRecipe.findFirst({
      where: eq(productionRecipe.id, id),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Deactivate the recipe
    await db
      .update(productionRecipe)
      .set({
        status: false,
        updatedAt: new Date(),
      })
      .where(eq(productionRecipe.id, id));

    return NextResponse.json({ message: 'Recipe deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate recipe' },
      { status: 500 }
    );
  }
}
