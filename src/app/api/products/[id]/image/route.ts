import { db } from '@/db/db';
import { product } from '@/drizzle/schema/products';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

async function uploadProductImageHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    // Check if product exists and is not deleted
    const [existingProduct] = await db
      .select()
      .from(product)
      .where(and(eq(product.id, id), isNull(product.deletedAt)))
      .limit(1);

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'products');
    const filePath = join(uploadDir, fileName);

    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update product with image path
    const imageUrl = `/uploads/products/${fileName}`;
    const [updatedProduct] = await db
      .update(product)
      .set({ image: imageUrl, updatedAt: new Date() })
      .where(eq(product.id, id))
      .returning({ id: product.id, image: product.image });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error uploading product image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

async function deleteProductImageHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    // Update product to remove image
    const [updatedProduct] = await db
      .update(product)
      .set({ image: null, updatedAt: new Date() })
      .where(and(eq(product.id, id), isNull(product.deletedAt)))
      .returning({ id: product.id });

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}

// POST /api/products/:id/image - Upload product image
export const POST = protectRoute(uploadProductImageHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});

// DELETE /api/products/:id/image - Delete product image
export const DELETE = protectRoute(deleteProductImageHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});
