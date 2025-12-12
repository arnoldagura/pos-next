import { db } from '@/db/db';
import { productionRecipe, productionRecipeIngredient } from '@/drizzle/schema';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createRecipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  outputType: z.enum(['product', 'material']),
  outputProductId: z.string().optional(),
  outputMaterialId: z.string().optional(),
  outputQuantity: z.number().positive('Output quantity must be positive'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  ingredients: z
    .array(
      z.object({
        materialId: z.string().min(1, 'Material is required'),
        quantity: z.number().positive('Quantity must be positive'),
        unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
      })
    )
    .min(1, 'At least one ingredient is required'),
  createdBy: z.string().optional(),
});

// GET /api/recipes - List recipes with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const outputType = searchParams.get('outputType');
    const statusParam = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(productionRecipe.name, `%${search}%`),
          ilike(productionRecipe.description, `%${search}%`)
        )
      );
    }

    if (outputType === 'product' || outputType === 'material') {
      conditions.push(eq(productionRecipe.outputType, outputType));
    }

    if (statusParam !== null) {
      const status = statusParam === 'active' ? true : false;

      conditions.push(eq(productionRecipe.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productionRecipe)
      .where(whereClause);

    const recipes = await db.query.productionRecipe.findMany({
      where: whereClause,
      with: {
        outputProduct: true,
        outputMaterial: true,
        ingredients: {
          with: {
            material: true,
          },
        },
      },
      orderBy: desc(productionRecipe.createdAt),
      limit,
      offset,
    });

    return NextResponse.json({
      recipes,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create new recipe
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createRecipeSchema.parse(body);

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

    const recipeId = `recipe_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    await db.transaction(async (tx) => {
      await tx.insert(productionRecipe).values({
        id: recipeId,
        name: validatedData.name,
        description: validatedData.description || null,
        outputType: validatedData.outputType,
        outputProductId: validatedData.outputProductId || null,
        outputMaterialId: validatedData.outputMaterialId || null,
        outputQuantity: validatedData.outputQuantity.toString(),
        unitOfMeasure: validatedData.unitOfMeasure,
        status: true,
        createdBy: validatedData.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ingredientValues = validatedData.ingredients.map((ingredient) => ({
        id: `recipe_ing_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        recipeId,
        materialId: ingredient.materialId,
        quantity: ingredient.quantity.toString(),
        unitOfMeasure: ingredient.unitOfMeasure,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await tx.insert(productionRecipeIngredient).values(ingredientValues);
    });

    const createdRecipe = await db.query.productionRecipe.findFirst({
      where: eq(productionRecipe.id, recipeId),
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

    return NextResponse.json(createdRecipe, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
