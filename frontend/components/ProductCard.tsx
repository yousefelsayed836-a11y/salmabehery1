'use client';

import Link from 'next/link';

interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  old_price?: number;
  main_image?: string;
  material?: string;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow product-card">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square bg-gray-200 relative product-image-container">
          {product.main_image ? (
            <img
              src={product.main_image}
              alt={product.name_en}
              className="w-full h-full object-cover product-image"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 product-text-area">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-800 mb-1 product-title">{product.name_en}</h3>
          <p className="text-sm text-gray-500 mb-2 product-name-ar">{product.name_ar}</p>
        </Link>

        <div className="flex items-center justify-between product-price-area">
          <div>
            <span className="text-lg font-bold text-gray-900 product-price">{product.price} EGP</span>
            {product.old_price && (
              <span className="text-sm text-gray-400 line-through ml-2 product-old-price">
                {product.old_price} EGP
              </span>
            )}
          </div>
        </div>

        {product.material && (
          <p className="text-xs text-gray-500 mt-2 product-material">{product.material}</p>
        )}
      </div>
    </div>
  );
}