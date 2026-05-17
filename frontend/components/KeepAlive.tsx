"use client";
import { useEffect } from "react";
const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";
export default function KeepAlive() {
  useEffect(() => {
    fetch(`${API}/ping`).catch(() => {});
    const id = setInterval(() => fetch(`${API}/ping`).catch(() => {}), 9 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}
