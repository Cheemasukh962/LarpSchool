"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";

import { publicSiteUrl } from "@/lib/site-url";

function subscribe() {
  return () => undefined;
}

export function JoinQr({ size = 220 }: { size?: number }) {
  const url = useSyncExternalStore(subscribe, publicSiteUrl, publicSiteUrl);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffd700" },
    }).then((data) => {
      if (alive) setSrc(data);
    });
    return () => {
      alive = false;
    };
  }, [url, size]);

  if (!src) {
    return (
      <div className="flex items-center justify-center bg-[#ffd700]" style={{ width: size, height: size }}>
        <span className="text-[#0a0a0a]">…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={src} alt="Scan to play" width={size} height={size} className="border-4 border-[#ffd700]" />
      <div className="max-w-[260px] break-all text-center text-[10px] text-[#ffd700]/70">{url}</div>
    </div>
  );
}
