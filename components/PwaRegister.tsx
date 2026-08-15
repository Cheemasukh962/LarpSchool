"use client";

import { useEffect } from "react";

import { startQueuePump } from "@/lib/write-queue";

export function PwaRegister() {
  useEffect(() => {
    startQueuePump();
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
