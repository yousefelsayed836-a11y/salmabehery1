import HomePageClient from "./HomePageClient";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salmabehery.com") + "/api";

export default async function HomePage() {
  let categories: any[] = [];
  let heroUrl = "/images/hero-bg.jpg";

  try {
    const [catsRes, heroRes] = await Promise.all([
      fetch(`${API}/categories`, { next: { revalidate: 300 } }),
      fetch(`${API}/settings/hero_image`, { next: { revalidate: 300 } }),
    ]);
    const cats = await catsRes.json();
    if (Array.isArray(cats)) categories = cats;
    const hero = await heroRes.json();
    if (hero?.value) heroUrl = hero.value;
  } catch {}

  return <HomePageClient initialCategories={categories} initialHeroUrl={heroUrl} />;
}
