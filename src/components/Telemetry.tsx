"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Envía un error al registro de Admin (como mucho 5 por visita, sin repetir el mismo)
const sent = new Set<string>();
export function reportError(message: string, stack?: string | null, digest?: string | null) {
  try {
    const key = `${message}|${digest ?? ""}`;
    if (sent.has(key) || sent.size >= 5) return;
    sent.add(key);
    createClient()
      .rpc("log_error", {
        p_message: message.slice(0, 500),
        p_stack: stack ? stack.slice(0, 4000) : null,
        p_path: window.location.pathname + window.location.search,
        p_digest: digest ?? null,
        p_ua: navigator.userAgent.slice(0, 300),
      })
      .then(() => {}, () => {});
  } catch {}
}

// Estadísticas de uso (solo las ve Admin): cuenta cada página vista, sin cookies ni datos personales.
// Y recoge los errores del navegador para avisar al administrador.
export function Telemetry() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    if (navigator.webdriver || /bot|crawl|spider|preview/i.test(navigator.userAgent)) return;
    last.current = pathname;
    createClient().rpc("track_view", { p_path: pathname }).then(() => {}, () => {});
  }, [pathname]);

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Errores de extensiones del navegador o de scripts externos: se ignoran
      if (!e.filename || !e.filename.includes(window.location.host)) return;
      reportError(e.message || "Error", e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | undefined;
      const msg = r?.message ?? String(e.reason ?? "Promesa rechazada");
      if (/abort|cancel|NEXT_REDIRECT|NEXT_NOT_FOUND|Failed to fetch|Load failed|NetworkError/i.test(msg)) return;
      reportError(msg, r?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
