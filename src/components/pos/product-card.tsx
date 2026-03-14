'use client';

import { memo } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProductPosItem } from '@/lib/types';

interface ProductCardProps {
  product: ProductPosItem;
  currentStock?: number;
  onAddToCart: (product: ProductPosItem) => void;
}

/**
 * Memoized product card component to prevent unnecessary re-renders
 */
export const ProductCard = memo(function ProductCard({
  product,
  currentStock = 0,
  onAddToCart,
}: ProductCardProps) {
  const isOutOfStock = currentStock <= 0;

  return (
    <div
      className={cn(
        'border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group',
        isOutOfStock && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => !isOutOfStock && onAddToCart(product)}
    >
      <div className='aspect-square relative mb-3 bg-gray-100 rounded-md overflow-hidden'>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 50vw, 25vw'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-gray-400'>
            <ShoppingCart className='h-12 w-12' />
          </div>
        )}
        {isOutOfStock && (
          <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
            <Badge variant='destructive'>Out of Stock</Badge>
          </div>
        )}
      </div>

      <div className='space-y-2'>
        <h3 className='font-semibold text-sm line-clamp-2 group-hover:text-blue-600 transition-colors'>
          {product.name}
        </h3>
        {product.sku && <p className='text-xs text-muted-foreground'>SKU: {product.sku}</p>}
        <div className='flex items-center justify-between'>
          <span className='text-lg font-bold'>${product.sellingPrice}</span>
          {!isOutOfStock && (
            <Badge variant='secondary' className='text-xs'>
              {currentStock} {product.unitOfMeasure || 'units'}
            </Badge>
          )}
        </div>
      </div>

      {!isOutOfStock && (
        <Button
          size='sm'
          className='w-full mt-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity min-h-[44px]'
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
        >
          <ShoppingCart className='h-4 w-4 mr-2' />
          Add to Cart
        </Button>
      )}
    </div>
  );
});
