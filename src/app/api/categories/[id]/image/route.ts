import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { db } from '@/db/db';
import { category } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { z } from 'zod';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';

const uploadImageSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  fileName: z.string().optional(),
});

async function uploadImageHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const existingCategory = await db
      .select()
      .from(category)
      .where(and(eq(category.id, id), isNull(category.deletedAt)))
      .limit(1);

    if (existingCategory.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = uploadImageSchema.parse(body);

    const matches = validatedData.image.match(
      /^data:([A-Za-z-+\/]+);base64,(.+)$/
    );
    if (!matches || matches.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected base64 encoded image.' },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Invalid image type. Allowed types: JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    const extension = mimeType.split('/')[1];
    const fileName = validatedData.fileName
      ? `${validatedData.fileName.replace(
          /[^a-z0-9-]/gi,
          '-'
        )}-${randomUUID()}.${extension}`
      : `category-${randomUUID()}.${extension}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'categories');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: 'Image size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    await writeFile(filePath, buffer);

    const imageUrl = `/uploads/categories/${fileName}`;
    const [updatedCategory] = await db
      .update(category)
      .set({
        image: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(category.id, id))
      .returning();

    return NextResponse.json({
      message: 'Image uploaded successfully',
      imageUrl,
      category: updatedCategory,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// DELETE: Remove category image
async function deleteImageHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    // Check if category exists and is not deleted
    const existingCategory = await db
      .select()
      .from(category)
      .where(and(eq(category.id, id), isNull(category.deletedAt)))
      .limit(1);

    if (existingCategory.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Update category to remove image
    const [updatedCategory] = await db
      .update(category)
      .set({
        image: null,
        updatedAt: new Date(),
      })
      .where(eq(category.id, id))
      .returning();

    return NextResponse.json({
      message: 'Image removed successfully',
      category: updatedCategory,
    });
  } catch (error) {
    console.error('Error removing image:', error);
    return NextResponse.json(
      { error: 'Failed to remove image' },
      { status: 500 }
    );
  }
}

export const POST = protectRoute(uploadImageHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.UPDATE,
});

export const DELETE = protectRoute(deleteImageHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.UPDATE,
});
