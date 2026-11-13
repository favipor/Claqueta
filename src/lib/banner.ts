// Banner de la tarjeta de perfil (Descubrir gente y cabecera del perfil).
// Se guarda en profiles.banner: «g:<clave>» (degradado) o «b:/ruta.jpg» (imagen de una peli o serie de TMDB).

export const BANNER_GRADIENTS: Record<string, string> = {
  teal: "from-teal-500 to-cyan-700",
  violeta: "from-violet-500 to-indigo-700",
  rojo: "from-red-500 to-rose-800",
  fuego: "from-amber-400 to-rose-600",
  atardecer: "from-orange-400 via-rose-500 to-fuchsia-700",
  bosque: "from-emerald-500 to-teal-800",
  oceano: "from-sky-500 to-indigo-700",
  neon: "from-fuchsia-500 to-purple-800",
  oro: "from-yellow-300 via-amber-500 to-orange-700",
  noche: "from-slate-700 via-indigo-900 to-neutral-950",
  menta: "from-lime-300 via-emerald-400 to-teal-600",
  cine: "from-neutral-800 via-red-900 to-neutral-950",
};

const AUTO = ["teal", "violeta", "fuego", "bosque", "oceano", "neon", "atardecer"];

export type Banner = { kind: "gradient"; key: string; cls: string } | { kind: "image"; path: string };

// Lo guardado, o null si no hay o no es válido
export function parseBanner(v: string | null | undefined): Banner | null {
  if (!v) return null;
  if (v.startsWith("g:")) {
    const key = v.slice(2);
    return BANNER_GRADIENTS[key] ? { kind: "gradient", key, cls: BANNER_GRADIENTS[key] } : null;
  }
  if (/^b:\/[A-Za-z0-9_-]{6,64}\.(jpg|png)$/.test(v)) return { kind: "image", path: v.slice(2) };
  return null;
}

// Si no has elegido nada: un degradado fijo según tu nombre de usuario (cada persona siempre el mismo)
export function autoGradient(username: string): string {
  const key = AUTO[[...username].reduce((a, c) => a + c.charCodeAt(0), 0) % AUTO.length];
  return BANNER_GRADIENTS[key];
}

export function isValidBanner(v: string | null): boolean {
  return v === null || parseBanner(v) !== null;
}
