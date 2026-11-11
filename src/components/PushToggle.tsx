"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "./I18nProvider";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy" | "error";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Ajustes → «Avisos en el móvil»: activa las notificaciones push en este dispositivo
// (mensajes, menciones, seguidores, capítulos nuevos...) aunque la web esté cerrada.
export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<State>("loading");
  const [detail, setDetail] = useState<string | null>(null);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      if (!vapid || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // En iPhone solo funciona con la web instalada en la pantalla de inicio
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapid]);

  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid!) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("no_session");
      // Si ya estaba guardada (mismo dispositivo) se sustituye
      await supabase.from("push_subscriptions").delete().eq("endpoint", json.endpoint);
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: session.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      if (error) throw new Error(error.message);
      setDetail(null);
      setState("on");
    } catch (e) {
      setDetail(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("error");
    }
  }

  const on = state === "on";
  const canToggle = state === "on" || state === "off" || state === "error";

  return (
    <section className="mx-auto mt-6 max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-fg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {t("push.title")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">{t("push.hint")}</p>
        </div>
        {canToggle || state === "busy" ? (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t("push.title")}
            disabled={state === "busy"}
            onClick={on ? disable : enable}
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:opacity-60 ${
              on ? "bg-brand" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
            />
          </button>
        ) : null}
      </div>
      {state !== "on" && state !== "off" && state !== "busy" && state !== "loading" && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${state === "error" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>
          {t(`push.${state}` as const)}
          {state === "error" && detail && <span className="mt-1 block text-xs opacity-80">({detail})</span>}
        </p>
      )}
    </section>
  );
}
