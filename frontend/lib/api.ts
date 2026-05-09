export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// ✅ Converts relative /uploads/... paths to full URLs
export function getImageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

// ✅ Get all products
export async function fetchProducts(params?: {
  category?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}) {
  const url = new URL(`${API_BASE}/products`);
  if (params?.category) url.searchParams.set('collection', params.category);
  if (params?.search) url.searchParams.set('search', params.search);
  if (params?.is_active !== undefined) url.searchParams.set('is_active', String(params.is_active));
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.limit) url.searchParams.set('limit', String(params.limit));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

// ✅ Get single product
export async function fetchProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

// ✅ Get all categories
export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

// ✅ Get category with products
export async function fetchCategory(slug: string) {
  const res = await fetch(`${API_BASE}/categories/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch category');
  return res.json();
}

// ✅ Upload image - returns full URL
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url; // full URL from backend
}

// ✅ Create order (COD)
export async function createOrder(orderData: any) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}

// ✅ Add product
export async function addProduct(data: any) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add product');
  return res.json();
}

// ✅ Update product
export async function updateProduct(id: string, data: any) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

// ✅ Delete product
export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}
