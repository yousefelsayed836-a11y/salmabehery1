import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://salmabehery.com";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/products?limit=1000`, { cache: "no-store" });
    const data = await res.json();
    const products: any[] = Array.isArray(data) ? data : data.products || [];

    const items = products
      .filter(p => p.is_active)
      .map(p => {
        const image = Array.isArray(p.images) ? p.images[0] : (p.images || "");
        const price = parseFloat(p.price) || 0;
        const available = (p.stock || 0) > 0 ? "in stock" : "out of stock";

        return `  <item>
    <id>${p.id}</id>
    <title><![CDATA[${p.name_en || p.name_ar || ""}]]></title>
    <description><![CDATA[${p.description || p.name_en || ""}]]></description>
    <availability>${available}</availability>
    <condition>new</condition>
    <price>${price.toFixed(2)} EGP</price>
    <link>${SITE}/products/${p.id}</link>
    <image_link>${image}</image_link>
    <brand><![CDATA[Salma Behery]]></brand>
    <google_product_category>188</google_product_category>
  </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Salma Behery Jewelry</title>
    <link>${SITE}</link>
    <description>Salma Behery jewelry catalog</description>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
