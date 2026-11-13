// Retos de grupo: sagas y colecciones para completar con tus amigos.
export type Challenge = {
  code: string;
  emoji: string;
  title: [string, string];
  blurb: [string, string];
  gradient: string;
  items: { tmdb_id: number; media_type: "movie" | "tv" }[];
};

const m = (...ids: number[]) => ids.map((tmdb_id) => ({ tmdb_id, media_type: "movie" as const }));

export const CHALLENGES: Challenge[] = [
  { code: "harry-potter", emoji: "⚡", title: ["Maratón Harry Potter", "Harry Potter marathon"], blurb: ["Las 8 películas de Hogwarts.", "All 8 Hogwarts movies."], gradient: "from-amber-500 via-red-700 to-neutral-950", items: m(671, 672, 673, 674, 675, 767, 12444, 12445) },
  { code: "tierra-media", emoji: "💍", title: ["La Tierra Media", "Middle-earth"], blurb: ["El Señor de los Anillos y El Hobbit.", "The Lord of the Rings and The Hobbit."], gradient: "from-yellow-600 via-emerald-800 to-neutral-950", items: m(120, 121, 122, 49051, 57158, 122917) },
  { code: "star-wars", emoji: "🌌", title: ["La saga Skywalker", "The Skywalker saga"], blurb: ["Los 9 episodios de Star Wars.", "All 9 Star Wars episodes."], gradient: "from-sky-500 via-indigo-900 to-neutral-950", items: m(1893, 1894, 1895, 11, 1891, 1892, 140607, 181808, 181812) },
  { code: "nolan", emoji: "🌀", title: ["Universo Nolan", "The Nolan collection"], blurb: ["10 películas de Christopher Nolan.", "10 Christopher Nolan films."], gradient: "from-slate-500 via-slate-800 to-neutral-950", items: m(77, 272, 1124, 155, 27205, 49026, 157336, 374720, 577922, 872585) },
  { code: "ghibli", emoji: "🍃", title: ["Viaje a Ghibli", "Ghibli journey"], blurb: ["10 joyas del Studio Ghibli.", "10 Studio Ghibli gems."], gradient: "from-lime-400 via-teal-700 to-neutral-950", items: m(129, 8392, 128, 4935, 16859, 81, 10515, 12429, 12477, 149870) },
  { code: "pixar", emoji: "🧸", title: ["Clásicos Pixar", "Pixar classics"], blurb: ["11 películas que marcaron una época.", "11 films that defined an era."], gradient: "from-blue-400 via-blue-800 to-neutral-950", items: m(862, 863, 10193, 585, 12, 9806, 2062, 10681, 14160, 150540, 354912) },
  { code: "breaking-bad", emoji: "🧪", title: ["Universo Breaking Bad", "Breaking Bad universe"], blurb: ["Breaking Bad, Better Call Saul y El Camino.", "Breaking Bad, Better Call Saul and El Camino."], gradient: "from-lime-500 via-green-900 to-neutral-950", items: [{ tmdb_id: 1396, media_type: "tv" }, { tmdb_id: 60059, media_type: "tv" }, { tmdb_id: 559969, media_type: "movie" }] },
];
