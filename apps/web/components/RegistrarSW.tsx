"use client";

import { useEffect } from "react";

/**
 * Registra o Service Worker em background, em produção.
 * Em dev (npm run dev) deixa passar para evitar interferência com HMR.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // log apenas — falha de SW não bloqueia o app
          console.warn("[NTANK] SW registration failed:", err);
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  return null;
}
