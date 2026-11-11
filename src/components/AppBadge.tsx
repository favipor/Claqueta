"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { markNotificationRead } from "@/app/social-actions";

type BadgeNav = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

// Cierra los avisos que siguen en la bandeja del móvil (y con ellos el punto del icono de la app)
async function closeSystemNotifications() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const list = (await reg?.getNotifications()) ?? [];
    list.forEach((n) => n.close());
  } catch {}
}

// · Número del icono de la app instalada = notificaciones sin leer
// · Al llegar desde un aviso (?aviso=id) se marca esa notificación como leída
// · Al abrir la página de notificaciones se limpian los avisos de la bandeja
export function AppBadge({ unread }: { unread: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const nav = navigator as BadgeNav;
    try {
      if (unread > 0) nav.setAppBadge?.(unread)?.catch(() => {});
      else nav.clearAppBadge?.()?.catch(() => {});
    } catch {}
    if (unread === 0) closeSystemNotifications();
  }, [unread]);

  useEffect(() => {
    const id = params.get("aviso");
    if (!id) return;
    markNotificationRead(id).then(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("aviso");
      router.replace(url.pathname + url.search + url.hash, { scroll: false });
      router.refresh();
    });
  }, [params, router]);

  useEffect(() => {
    if (pathname === "/notificaciones") closeSystemNotifications();
  }, [pathname]);

  return null;
}
