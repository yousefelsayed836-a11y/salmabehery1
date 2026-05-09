// app/product/[slug]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  images: string[];
  material: string;
  water_resistance: string | null;
  size_info: string | null;
  status: string;
  collections: string[];
  variants: Array<{
    id: number;
    option_name: string;
    option_value: string;
    quantity: number;
    price_override: number | null;
  }>;
  total_quantity: number;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${slug}`, {
      cache: 'no-store'
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }
  
  const hasVariants = product.variants && product.variants.length > 0;
  const isOutOfStock = product.total_quantity === 0;
  
  // Material color
  const materialColor = product.material === 'Gold Plated' || product.material === 'Platinum' 
    ? '#D4AF37' 
    : product.material === 'Stainless Steel' 
    ? '#C0C0C0' 
    : '#666';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Images */}
            <div className="space-y-4">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img 
                  src={product.images?.[0] || '/placeholder.png'} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <p className="text-gray-600">{product.description}</p>
              </div>
              
              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-gray-900">{product.price} EGP</span>
                {product.sale_price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">{product.sale_price} EGP</span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      SALE
                    </span>
                  </>
                )}
              </div>
              
              {/* Material */}
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Material:</span>
                <span className="font-medium" style={{ color: materialColor }}>
                  {product.material}
                </span>
              </div>
              
              {/* Water Resistance */}
              {product.water_resistance && (
                <div className="flex items-center gap-2 text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{product.water_resistance}</span>
                </div>
              )}
              
              {/* Size Info */}
              {product.size_info && (
                <div className="text-gray-600">
                  Size: <span className="font-medium text-gray-900">{product.size_info}</span>
                </div>
              )}
              
              {/* Variants */}
              {hasVariants && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Available Options:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <span 
                        key={variant.id}
                        className={`px-4 py-2 rounded-lg border ${
                          variant.quantity > 0 
                            ? 'border-gray-300 bg-white' 
                            : 'border-gray-200 bg-gray-100 text-gray-400'
                        }`}
                      >
                        {variant.option_value}
                        {variant.quantity === 0 && ' (Out of Stock)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Stock Status */}
              <div>
                {isOutOfStock ? (
                  <span className="text-red-500 font-medium">Out of Stock</span>
                ) : (
                  <span className="text-green-600 font-medium">In Stock ({product.total_quantity} available)</span>
                )}
              </div>
              
              {/* Collections */}
              <div className="flex flex-wrap gap-2">
                {product.collections?.map((col: string) => (
                  <span key={col} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {col}
                  </span>
                ))}
              </div>
              
              {/* Add to Cart Button */}
              <button 
                disabled={isOutOfStock}
                className={`w-full py-4 rounded-xl font-bold text-lg ${
                  isOutOfStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-pink-500 text-white hover:bg-pink-600'
                }`}
              >
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}