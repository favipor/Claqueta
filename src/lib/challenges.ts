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
  { code: "marvel", emoji: "🦸", title: ["Lo esencial de Marvel", "Marvel essentials"], blurb: ["10 películas clave hasta Endgame.", "10 key films up to Endgame."], gradient: "from-red-500 via-red-900 to-neutral-950", items: m(1726, 24428, 99861, 271110, 118340, 284053, 284054, 315635, 299536, 299534) },
  { code: "padrino", emoji: "🌹", title: ["La trilogía de El Padrino", "The Godfather trilogy"], blurb: ["Una oferta que no podrás rechazar.", "An offer you can't refuse."], gradient: "from-stone-500 via-stone-800 to-neutral-950", items: m(238, 240, 242) },
  { code: "regreso-futuro", emoji: "⏰", title: ["Regreso al futuro", "Back to the Future"], blurb: ["Las 3 películas a 88 millas por hora.", "All 3 films at 88 miles per hour."], gradient: "from-orange-400 via-rose-700 to-neutral-950", items: m(105, 165, 196) },
  { code: "matrix", emoji: "💊", title: ["Saga Matrix", "The Matrix saga"], blurb: ["¿Pastilla roja o azul? Las 4.", "Red pill or blue? All 4."], gradient: "from-green-500 via-emerald-900 to-neutral-950", items: m(603, 604, 605, 624860) },
  { code: "indiana", emoji: "🤠", title: ["Indiana Jones", "Indiana Jones"], blurb: ["Las 5 aventuras del arqueólogo.", "All 5 archaeologist adventures."], gradient: "from-amber-600 via-yellow-900 to-neutral-950", items: m(85, 87, 89, 217, 335977) },
  { code: "jurassic", emoji: "🦖", title: ["Parque Jurásico", "Jurassic Park"], blurb: ["Las 6 películas de dinosaurios.", "All 6 dinosaur films."], gradient: "from-lime-500 via-emerald-800 to-neutral-950", items: m(329, 330, 331, 135397, 351286, 507086) },
  { code: "piratas", emoji: "🏴‍☠️", title: ["Piratas del Caribe", "Pirates of the Caribbean"], blurb: ["Las 5 travesías de Jack Sparrow.", "Jack Sparrow's 5 voyages."], gradient: "from-cyan-500 via-slate-800 to-neutral-950", items: m(22, 58, 285, 1865, 166426) },
  { code: "shrek", emoji: "🧅", title: ["Saga Shrek", "Shrek saga"], blurb: ["Las 4 del ogro más querido.", "The beloved ogre's 4 films."], gradient: "from-lime-400 via-green-700 to-neutral-950", items: m(808, 809, 810, 10192) },
  { code: "juegos-hambre", emoji: "🏹", title: ["Los Juegos del Hambre", "The Hunger Games"], blurb: ["Que la suerte esté de vuestra parte.", "May the odds be ever in your favour."], gradient: "from-orange-500 via-red-900 to-neutral-950", items: m(70160, 101299, 131631, 131634, 695721) },
  { code: "alien", emoji: "👽", title: ["Saga Alien", "Alien saga"], blurb: ["En el espacio nadie puede oír tus gritos.", "In space no one can hear you scream."], gradient: "from-teal-500 via-slate-900 to-neutral-950", items: m(348, 679, 8077, 8078, 70981, 126889, 945961) },
  { code: "mision-imposible", emoji: "🕶️", title: ["Misión imposible", "Mission: Impossible"], blurb: ["7 misiones de Ethan Hunt.", "7 Ethan Hunt missions."], gradient: "from-zinc-400 via-zinc-800 to-neutral-950", items: m(954, 955, 956, 56292, 177677, 353081, 575264) },
  { code: "poniente", emoji: "🐉", title: ["Poniente", "Westeros"], blurb: ["Juego de tronos y La casa del dragón.", "Game of Thrones and House of the Dragon."], gradient: "from-red-700 via-neutral-800 to-neutral-950", items: [{ tmdb_id: 1399, media_type: "tv" }, { tmdb_id: 94997, media_type: "tv" }] },
  { code: "breaking-bad", emoji: "🧪", title: ["Universo Breaking Bad", "Breaking Bad universe"], blurb: ["Breaking Bad, Better Call Saul y El Camino.", "Breaking Bad, Better Call Saul and El Camino."], gradient: "from-lime-500 via-green-900 to-neutral-950", items: [{ tmdb_id: 1396, media_type: "tv" }, { tmdb_id: 60059, media_type: "tv" }, { tmdb_id: 559969, media_type: "movie" }] },
];
