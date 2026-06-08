import { redirect, notFound } from "next/navigation";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

export default async function ProductSlugPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  try {
    const res = await fetch(`${API}/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return notFound();
    const data = await res.json();
    const id = data?.product?.id;
    if (!id) return notFound();
    redirect(`/products/${id}`);
  } catch {
    return notFound();
  }
}
