"use client";
import { useEffect } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

export default function FaviconUpdater() {
  useEffect(() => {
    fetch(`${API}/settings/favicon`)
      .then(r => r.json())
      .then(d => {
        if (!d.value) return;
        const existing = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (existing) {
          existing.href = d.value;
        } else {
          const link = document.createElement("link");
          link.rel = "icon";
          link.href = d.value;
          document.head.appendChild(link);
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
