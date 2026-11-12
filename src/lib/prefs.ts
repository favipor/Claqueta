// «Memoria» de las pantallas: guarda en una cookie cómo dejaste los filtros (calendario, Mi lista...)
// para que al volver a esa página desde el menú siga igual. La cookie la lee también el servidor.

export const PREF_COOKIES = { calendar: "claq_cal", myList: "claq_list" } as const;

// En el navegador: guarda la búsqueda («ver=visto&cine=1») durante un año
export function savePref(name: string, query: string) {
  try {
    document.cookie = query
      ? `${name}=${encodeURIComponent(query)}; path=/; max-age=31536000; samesite=lax`
      : `${name}=; path=/; max-age=0; samesite=lax`;
  } catch {}
}

// En el servidor: si la dirección no trae filtros, usa los guardados
export function withSavedPrefs<T extends Record<string, string | undefined>>(sp: T, saved: string | undefined, keys: (keyof T)[]): T {
  const hasAny = keys.some((k) => sp[k] !== undefined);
  if (hasAny || !saved) return sp;
  try {
    const q = new URLSearchParams(decodeURIComponent(saved));
    const out = { ...sp };
    for (const k of keys) {
      const v = q.get(String(k));
      if (v !== null) (out as Record<string, string | undefined>)[k as string] = v;
    }
    return out;
  } catch {
    return sp;
  }
}
