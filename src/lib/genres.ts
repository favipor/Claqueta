// Géneros de TMDB (películas y series) en español e inglés, para las estadísticas del perfil.
const G: Record<number, [string, string]> = {
  28: ["Acción", "Action"],
  12: ["Aventura", "Adventure"],
  16: ["Animación", "Animation"],
  35: ["Comedia", "Comedy"],
  80: ["Crimen", "Crime"],
  99: ["Documental", "Documentary"],
  18: ["Drama", "Drama"],
  10751: ["Familiar", "Family"],
  14: ["Fantasía", "Fantasy"],
  36: ["Historia", "History"],
  27: ["Terror", "Horror"],
  10402: ["Música", "Music"],
  9648: ["Misterio", "Mystery"],
  10749: ["Romance", "Romance"],
  878: ["Ciencia ficción", "Science Fiction"],
  10770: ["Película de TV", "TV Movie"],
  53: ["Suspense", "Thriller"],
  10752: ["Bélica", "War"],
  37: ["Western", "Western"],
  10759: ["Acción y aventura", "Action & Adventure"],
  10762: ["Infantil", "Kids"],
  10763: ["Noticias", "News"],
  10764: ["Reality", "Reality"],
  10765: ["Ciencia ficción y fantasía", "Sci-Fi & Fantasy"],
  10766: ["Telenovela", "Soap"],
  10767: ["Entrevistas", "Talk"],
  10768: ["Guerra y política", "War & Politics"],
};

export function genreName(id: number, lang: string): string {
  const g = G[id];
  if (!g) return `#${id}`;
  return lang === "en" ? g[1] : g[0];
}
