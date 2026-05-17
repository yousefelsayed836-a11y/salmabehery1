"use client";
import { useEffect } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

export default function FaviconUpdater() {
  useEffect(() => {
    fetch(`${API}/settings/favicon`)
      .then(r => r.json())
      .then(d => {
        if (!d.value) return;
        // Remove all existing icon links then add fresh one
        document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']").forEach(el => el.remove());
        const link = document.createElement("link");
        link.rel = "icon";
        link.type = d.value.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        link.href = d.value + "?t=" + Date.now();
        document.head.appendChild(link);
      })
      .catch(() => {});
  }, []);
  return null;
}
