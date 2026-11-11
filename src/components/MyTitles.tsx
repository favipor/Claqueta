"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Status } from "@/lib/dict";

// Estado y nota que has dado a cada título, para enseñarlos en todas las carátulas
// (portada, películas, series, búsqueda...) sin tener que ir a «Mi lista».
export type MyTitle = { status: Status | null; rating: number | null };

let map = new Map<string, MyTitle>();
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
    lastLoad = Date.now();
    listeners.forEach((l) => l());
  } catch {
    // sin conexión: las carátulas se ven sin etiquetas
  } finally {
    inflight = false;
  }
}

// Se monta una vez en el layout: carga al entrar y se refresca al cambiar de página
// (así, al volver de una ficha donde has marcado algo, la carátula ya sale actualizada).
export function MyTitlesSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (Date.now() - lastLoad > 1500) load();
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
