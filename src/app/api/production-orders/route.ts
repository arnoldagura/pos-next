import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { productionOrder } from '@/drizzle/schema';
import {
  createFromRecipe,
  ProductionOrderStatus,
} from '@/lib/services/production-workflow';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

const ingredientSchema = z.object({
  materialId: z.string().min(1, 'Material ID is required'),
  materialInventoryId: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  cost: z.number().nonnegative('Cost must be non-negative').optional(),
});

const createProductionOrderSchema = z.object({
  recipeId: z.string().min(1, 'Recipe is required'),
  locationId: z.string().min(1, 'Location is required'),
  plannedQuantity: z.number().positive('Quantity must be positive'),
  scheduledDate: z.string().optional(),
  createdBy: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
});

// GET /api/production-orders - List production orders with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const recipeId = searchParams.get('recipeId');
    // const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereConditions = [];

    if (status) {
      whereConditions.push(
        eq(productionOrder.status, status as ProductionOrderStatus)
      );
    }

    if (locationId) {
      whereConditions.push(eq(productionOrder.locationId, locationId));
    }

    if (recipeId) {
      whereConditions.push(eq(productionOrder.recipeId, recipeId));
    }

    if (startDate) {
      whereConditions.push(
        gte(productionOrder.scheduledDate, new Date(startDate))
      );
    }

    if (endDate) {
      whereConditions.push(
        lte(productionOrder.scheduledDate, new Date(endDate))
      );
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(productionOrder)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = Number(countResult[0]?.count || 0);

    // Get orders with relations
    const orders = await db.query.productionOrder.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        recipe: {
          columns: {
            id: true,
            name: true,
            outputQuantity: true,
            unitOfMeasure: true,
          },
        },
        location: {
          columns: {
            id: true,
            name: true,
          },
        },
        outputProductInventory: {
          columns: {
            id: true,
            variantName: true,
          },
          with: {
            product: true,
          },
        },
        outputMaterialInventory: {
          columns: {
            id: true,
            variantName: true,
          },
          with: {
            material: true,
          },
        },
        materials: {
          with: {
            materialInventory: {
              columns: {
                id: true,
              },
              with: {
                material: true,
              },
            },
          },
        },
      },
      limit,
      offset,
      orderBy: [desc(productionOrder.createdAt)],
    });

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching production orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production orders' },
      { status: 500 }
    );
  }
}

// POST /api/production-orders - Create new production order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = createProductionOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      recipeId,
      locationId,
      plannedQuantity,
      scheduledDate,
      createdBy,
      ingredients,
    } = validation.data;

    const orderId = await createFromRecipe({
      recipeId,
      locationId,
      plannedQuantity,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      createdBy,
      ingredients,
    });

    const order = await db.query.productionOrder.findFirst({
      where: eq(productionOrder.id, orderId),
      with: {
        recipe: true,
        location: true,
        outputProductInventory: true,
        outputMaterialInventory: true,
        materials: {
          with: {
            materialInventory: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating production order:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create production order' },
      { status: 500 }
    );
  }
}
