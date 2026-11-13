// Logros: 15 insignias con tres niveles (bronce, plata y oro). Se calculan con achievement_stats (phase11.sql).
export type AchStats = Record<
  | "movies" | "series" | "episodes" | "ratings" | "tens" | "pending" | "rewatch" | "genres" | "hours"
  | "lists" | "comments" | "following" | "followers" | "best_day_eps" | "streak" | "best_streak",
  number
>;

export type Achievement = {
  id: string;
  emoji: string;
  stat: keyof AchStats;
  tiers: [number, number, number];
  name: [string, string]; // [es, en]
  unit: [string, string]; // texto del progreso: «películas vistas»
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "cinefilo", emoji: "🎬", stat: "movies", tiers: [10, 50, 200], name: ["Cinéfilo", "Film buff"], unit: ["películas vistas", "movies watched"] },
  { id: "seriefilo", emoji: "📺", stat: "series", tiers: [5, 25, 75], name: ["Seriéfilo", "Series addict"], unit: ["series vistas", "series watched"] },
  { id: "capitulos", emoji: "🍿", stat: "episodes", tiers: [50, 500, 2000], name: ["Devora capítulos", "Episode eater"], unit: ["capítulos", "episodes"] },
  { id: "maraton", emoji: "🏃", stat: "best_day_eps", tiers: [5, 10, 20], name: ["Maratoniano", "Binge watcher"], unit: ["capítulos en un día", "episodes in one day"] },
  { id: "racha", emoji: "🔥", stat: "best_streak", tiers: [3, 7, 30], name: ["En racha", "On fire"], unit: ["días seguidos", "days in a row"] },
  { id: "critico", emoji: "⭐", stat: "ratings", tiers: [10, 50, 200], name: ["Crítico", "Critic"], unit: ["notas puestas", "ratings given"] },
  { id: "obra", emoji: "💯", stat: "tens", tiers: [1, 5, 20], name: ["Obra maestra", "Masterpiece"], unit: ["dieces", "perfect 10s"] },
  { id: "explorador", emoji: "🧭", stat: "genres", tiers: [5, 10, 15], name: ["Explorador", "Explorer"], unit: ["géneros distintos", "different genres"] },
  { id: "horas", emoji: "⏱️", stat: "hours", tiers: [24, 100, 500], name: ["Horas de sofá", "Couch hours"], unit: ["horas vistas", "hours watched"] },
  { id: "deseos", emoji: "📌", stat: "pending", tiers: [10, 50, 150], name: ["Lista de deseos", "Wishlist"], unit: ["pendientes", "on your watchlist"] },
  { id: "nostalgico", emoji: "🔁", stat: "rewatch", tiers: [1, 5, 15], name: ["Nostálgico", "Nostalgic"], unit: ["para volver a ver", "to rewatch"] },
  { id: "coleccionista", emoji: "📚", stat: "lists", tiers: [1, 3, 10], name: ["Coleccionista", "Curator"], unit: ["listas creadas", "lists created"] },
  { id: "tertuliano", emoji: "💬", stat: "comments", tiers: [1, 10, 50], name: ["Tertuliano", "Talker"], unit: ["comentarios", "comments"] },
  { id: "sociable", emoji: "🤝", stat: "following", tiers: [1, 5, 20], name: ["Sociable", "Social"], unit: ["personas que sigues", "people you follow"] },
  { id: "popular", emoji: "🌟", stat: "followers", tiers: [1, 10, 50], name: ["Popular", "Popular"], unit: ["seguidores", "followers"] },
];

export const TIER_NAMES: [string, string][] = [
  ["Bronce", "Bronze"],
  ["Plata", "Silver"],
  ["Oro", "Gold"],
];

/** Nivel conseguido: 0 = ninguno, 1 = bronce, 2 = plata, 3 = oro */
export function tierOf(a: Achievement, s: AchStats) {
  const v = s[a.stat] ?? 0;
  return a.tiers.filter((t) => v >= t).length;
}

/** Códigos conseguidos («cinefilo:2» = plata) */
export function unlockedCodes(s: AchStats) {
  return ACHIEVEMENTS.flatMap((a) => Array.from({ length: tierOf(a, s) }, (_, i) => `${a.id}:${i + 1}`));
}

export const TOTAL_TIERS = ACHIEVEMENTS.length * 3;
