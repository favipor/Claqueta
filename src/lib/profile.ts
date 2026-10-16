export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Debe coincidir con la lista de supabase/phase3.sql
export const RESERVED_USERNAMES = [
  "admin",
  "administrador",
  "claqueta",
  "soporte",
  "support",
  "moderador",
  "moderator",
  "root",
  "api",
  "null",
  "undefined",
  "ayuda",
  "help",
];

export const PRIVACY_COOLDOWN_DAYS = 7;

export type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  privacy_changed_at: string | null;
};

export function usernameProblem(u: string): "invalid" | "reserved" | null {
  if (!USERNAME_RE.test(u)) return "invalid";
  if (RESERVED_USERNAMES.includes(u)) return "reserved";
  return null;
}

// Si la privacidad se cambió hace menos de 7 días, devuelve cuándo se podrá volver a cambiar.
export function privacyCooldownUntil(changedAt: string | null): Date | null {
  if (!changedAt) return null;
  const until = new Date(changedAt).getTime() + PRIVACY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return until > Date.now() ? new Date(until) : null;
}

export type ProfileStats = {
  movies_seen: number;
  series_seen: number;
  watching: number;
  pending: number;
  avg_rating: number | null;
  movie_minutes: number;
  episodes: number;
  tv_minutes: number;
  genres: { id: number; n: number }[];
};
