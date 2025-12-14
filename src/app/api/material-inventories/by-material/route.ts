import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialInventory } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';

// GET /api/material-inventories/by-material?materialId=xxx&locationId=yyy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const materialId = searchParams.get('materialId');
    const locationId = searchParams.get('locationId');

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId is required' },
        { status: 400 }
      );
    }

    const whereConditions = [eq(materialInventory.materialId, materialId)];

    if (locationId) {
      whereConditions.push(eq(materialInventory.locationId, locationId));
    }

    const inventories = await db.query.materialInventory.findMany({
      where: and(...whereConditions),
      with: {
        material: {
          columns: {
            id: true,
            name: true,
          },
        },
        location: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(inventories);
  } catch (error) {
    console.error('Error fetching material inventories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material inventories' },
      { status: 500 }
    );
  }
}
