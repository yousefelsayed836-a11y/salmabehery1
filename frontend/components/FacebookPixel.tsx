"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

export default function FacebookPixel() {
  const pathname = usePathname();

  useEffect(() => {
    fetch(`${API}/settings/fb_pixel_id`)
      .then(r => r.json())
      .then(d => {
        if (!d.value) return;
        const pixelId = d.value;

        // Already injected?
        if ((window as any).fbq) {
          (window as any).fbq("track", "PageView");
          return;
        }

        // Inject pixel script — append to body to avoid conflicting with React's head management
        const script = document.createElement("script");
        script.id = "fb-pixel-script";
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `;
        document.body.appendChild(script);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if ((window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname]);

  return null;
}
