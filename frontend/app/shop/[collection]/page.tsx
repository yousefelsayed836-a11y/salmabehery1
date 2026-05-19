"use client";
import { use } from "react";
import ShopPage from "@/components/ShopPage";

export default function DynamicCollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = use(params);
  const title = collection
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return <ShopPage collectionSlug={collection} title={title} breadcrumb={title} />;
}
