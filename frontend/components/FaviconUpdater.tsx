"use client";
import { useEffect } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com";
function resolveUrl(url: string) { return url.startsWith("http") ? url : `${BACKEND}${url}`; }

export default function FaviconUpdater() {
  useEffect(() => {
    fetch(`${API}/settings/favicon`)
      .then(r => r.json())
      .then(d => {
        if (!d.value) return;
        const href = resolveUrl(d.value);
        const ts = "?t=" + Date.now();
        // Update every existing favicon link so the browser picks it up
        const existing = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
        if (existing.length > 0) {
          existing.forEach(el => { el.href = href + ts; });
        } else {
          const link = document.createElement("link");
          link.rel = "icon";
          link.href = href + ts;
          document.head.appendChild(link);
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
