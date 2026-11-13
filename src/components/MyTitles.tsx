"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Status } from "@/lib/dict";

// Estado y nota que has dado a cada título, para enseñarlos en todas las carátulas
// (portada, películas, series, búsqueda...) sin tener que ir a «Mi lista».
export type MyTitle = { status: Status | null; rating: number | null };

let map = new Map<string, MyTitle>();
let loggedIn = false;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const keyOf = (type: string, id: number) => `${type}-${id}`;

let inflight = false;
let lastLoad = 0;

async function load() {
  if (inflight) return;
  inflight = true;
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const next = new Map<string, MyTitle>();
    if (session) {
      // La base de datos solo devuelve las filas de quien ha iniciado sesión. Se piden en tandas de 1000.
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error } = await supabase
          .from("user_titles")
          .select("tmdb_id, media_type, status, rating")
          .range(from, from + 999);
        if (error || !data) break;
        for (const r of data) {
          next.set(keyOf(r.media_type as string, r.tmdb_id as number), {
            status: (r.status as Status | null) ?? null,
            rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
          });
        }
        if (data.length < 1000) break;
      }
    }
    map = next;
    loggedIn = !!session;
    lastLoad = Date.now();
    listeners.forEach((l) => l());
  } catch {
    // sin conexión: las carátulas se ven sin etiquetas
  } finally {
    inflight = false;
  }
}

// Cambio puntual tras marcar o puntuar algo: la carátula se actualiza al momento sin recargar todo
export function setMyTitle(type: string, id: number, patch: Partial<MyTitle>) {
  const key = keyOf(type, id);
  const cur = map.get(key) ?? { status: null, rating: null };
  const next = { ...cur, ...patch };
  map = new Map(map);
  if (next.status === null && next.rating === null) map.delete(key);
  else map.set(key, next);
  listeners.forEach((l) => l());
  // avisa a quien quiera reaccionar (p. ej. los logros)
  if (typeof window !== "undefined") window.dispatchEvent(new Event("claq:title-changed"));
}

// Recarga completa (tras acciones que pueden cambiar varios estados, como las reglas de las series)
export function reloadMyTitles() {
  return load();
}

// Se monta una vez en el layout: carga al entrar e inicio/cierre de sesión. Al cambiar de página
// solo se recarga si han pasado más de 5 minutos (por si has marcado algo desde otro dispositivo).
export function MyTitlesSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (Date.now() - lastLoad > 5 * 60 * 1000) load();
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}

export function useMyTitle(type: string, id: number): MyTitle | undefined {
  return useSyncExternalStore(
    subscribe,
    () => map.get(keyOf(type, id)),
    () => undefined
  );
}

// ¿Hay sesión iniciada? (para enseñar o no los botones rápidos de las carátulas)
export function useLoggedIn(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => loggedIn,
    () => false
  );
}
