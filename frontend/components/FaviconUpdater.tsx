"use client";
import { useEffect } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

export default function FaviconUpdater() {
  useEffect(() => {
    fetch(`${API}/settings/favicon`)
      .then(r => r.json())
      .then(d => {
        if (!d.value) return;
        // Only touch our own element — never remove React-managed nodes
        let link = document.getElementById("dynamic-favicon") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.id = "dynamic-favicon";
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.type = d.value.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        link.href = d.value + "?t=" + Date.now();
      })
      .catch(() => {});
  }, []);
  return null;
}
