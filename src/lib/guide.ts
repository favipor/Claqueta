import type { Lang } from "./dict";

export type GuideSection = { id: string; title: string; text: string[]; tip?: string; href?: string; cta?: string };

const es: { intro: string; sections: GuideSection[] } = {
  intro:
    "Claqueta es tu diario de cine y series, y también un sitio para compartirlo con tus amigos. Esto es todo lo que puedes hacer.",
  sections: [
    {
      id: "catalogo",
      title: "1. Explora el catálogo",
      text: [
        "En Películas y Series ves tendencias y puedes filtrar por tipo (incluido anime y documentales), ordenar y seguir cargando más.",
        "El buscador de arriba encuentra títulos y también personas, por usuario o por nombre.",
      ],
      href: "/peliculas",
      cta: "Ir a Películas",
    },
    {
      id: "ficha",
      title: "2. La ficha de cada título",
      text: [
        "Sinopsis, reparto, tráiler, dónde verlo (plataformas), nota de TMDB y la nota media de la comunidad de Claqueta.",
        "El recuadro «¿Qué viene después?» te dice cuándo sale el próximo capítulo o temporada, si la serie ha terminado o está cancelada, o si hay secuela de una película.",
        "Al final de la ficha tienes títulos similares para seguir descubriendo.",
      ],
    },
    {
      id: "seguimiento",
      title: "3. Marca lo que ves",
      text: [
        "Cada título puede estar en Pendiente, Viendo, Visto o Volver a ver, y puedes puntuarlo de 0 a 10 en pasos de 0,5.",
        "Tienes una nota privada por título: solo la ves tú, nadie más.",
        "En las series puedes marcar temporada por temporada y capítulo por capítulo, con barra de progreso. «Marcar hasta aquí» marca de golpe todos los capítulos anteriores.",
      ],
    },
    {
      id: "milista",
      title: "4. Tu lista",
      text: [
        "En Mi lista ves todo lo que has marcado. Filtra por estado y tipo, y ordena por nota (más alta o más baja), título, duración o fecha. También puedes filtrar por género.",
        "Puedes importar tu Excel (columnas NOMBRE, TIPO, VISUALIZACION y NOTA) y exportar tu lista a Excel cuando quieras.",
      ],
      href: "/mi-lista",
      cta: "Ir a Mi lista",
    },
    {
      id: "listas",
      title: "5. Listas personalizadas",
      text: [
        "Crea listas como «Maratón Harry Potter» con películas y series mezcladas, ponles descripción y ordénalas como quieras.",
        "Cada lista puede ser Pública, solo para Amigos o Privada. Añade títulos desde su ficha con el botón «Añadir a lista».",
      ],
    },
    {
      id: "perfil",
      title: "6. Tu perfil",
      text: [
        "Tu perfil muestra tu actividad y tus estadísticas (horas vistas, géneros favoritos…). Puede ser público o privado: si es privado, solo lo ven quienes te siguen y has aceptado.",
        "Cambiar entre público y privado solo se puede una vez por semana. Tu nombre de usuario (@) no se puede cambiar una vez elegido.",
        "Desde tu perfil accedes a tus notificaciones, mensajes y listas, y puedes copiar tu enlace para invitar a gente.",
      ],
    },
    {
      id: "social",
      title: "7. Gente y amigos",
      text: [
        "En Descubrir verás personas con gustos parecidos a los tuyos, con un porcentaje de afinidad y los títulos que tenéis en común. Cuantos más títulos marques y puntúes, mejores sugerencias.",
        "Para invitar a un amigo, copia el enlace de tu perfil (botón «Invitar con mi enlace») y mándaselo.",
        "Seguir a un perfil público es inmediato; en un perfil privado se envía una solicitud que la otra persona acepta o rechaza.",
      ],
      href: "/descubrir",
      cta: "Ir a Descubrir",
    },
    {
      id: "conversacion",
      title: "8. Conversación en cada título",
      text: [
        "Cada película o serie tiene su conversación. Puedes escribir, responder, editar y borrar tus mensajes, marcar spoilers y elegir quién lo ve (Público, Amigos o Privado).",
        "Menciona a alguien con @usuario y le llegará un aviso. Puedes denunciar mensajes inadecuados.",
      ],
    },
    {
      id: "mensajes",
      title: "9. Mensajes privados y recomendaciones",
      text: [
        "Chatea en privado con quien te sigue y sigues. A quien no te sigue puedes enviarle una solicitud de mensaje (hasta 3 mensajes) que acepta o rechaza.",
        "Con el botón «Recomendar» de una ficha envías el título como tarjeta con el póster; quien lo recibe puede añadirlo a Pendientes con un clic. Solo se puede recomendar entre seguidores mutuos.",
        "No hay «visto»: nadie sabe si has leído sus mensajes.",
      ],
      href: "/mensajes",
      cta: "Ir a Mensajes",
    },
    {
      id: "avisos",
      title: "10. Avisos y bloqueos",
      text: [
        "Un punto rojo en tu foto te avisa de seguidores nuevos, solicitudes, respuestas, menciones, mensajes y recomendaciones.",
        "Puedes bloquear a cualquier persona desde su perfil: dejaréis de seguiros y no podrá seguirte ni responderte. Desde Ajustes puedes desbloquear.",
      ],
    },
    {
      id: "accesibilidad",
      title: "11. Accesibilidad y apariencia",
      text: [
        "El botón redondo de abajo a la derecha abre el panel de accesibilidad: tamaño de letra, alto contraste, tipo de letra para dislexia, reducir animaciones y subrayar enlaces.",
        "Arriba tienes el cambio de tema claro/oscuro y de idioma (español/inglés).",
      ],
    },
  ],
};

const en: { intro: string; sections: GuideSection[] } = {
  intro:
    "Claqueta is your movie and series diary, and a place to share it with your friends. Here's everything you can do.",
  sections: [
    {
      id: "catalogo",
      title: "1. Explore the catalog",
      text: [
        "In Movies and Series you'll see trends and can filter by type (including anime and documentaries), sort, and keep loading more.",
        "The search bar finds titles and also people, by username or name.",
      ],
      href: "/peliculas",
      cta: "Go to Movies",
    },
    {
      id: "ficha",
      title: "2. Each title's page",
      text: [
        "Synopsis, cast, trailer, where to watch (streaming platforms), TMDB rating and the average rating of the Claqueta community.",
        "The “What's next?” box tells you when the next episode or season comes out, whether the show has ended or been cancelled, or whether a movie has a sequel.",
        "At the bottom there are similar titles to keep discovering.",
      ],
    },
    {
      id: "seguimiento",
      title: "3. Track what you watch",
      text: [
        "Each title can be Pending, Watching, Watched or Rewatch, and you can rate it from 0 to 10 in 0.5 steps.",
        "You get a private note per title: only you can see it.",
        "For series you can mark season by season and episode by episode, with a progress bar. “Mark up to here” marks all previous episodes at once.",
      ],
    },
    {
      id: "milista",
      title: "4. Your list",
      text: [
        "My list shows everything you've marked. Filter by status and type, and sort by rating (highest or lowest), title, length or date. You can also filter by genre.",
        "You can import your Excel (columns NOMBRE, TIPO, VISUALIZACION and NOTA) and export your list to Excel whenever you like.",
      ],
      href: "/mi-lista",
      cta: "Go to My list",
    },
    {
      id: "listas",
      title: "5. Custom lists",
      text: [
        "Create lists like “Harry Potter marathon” mixing movies and series, add a description and order them as you wish.",
        "Each list can be Public, Friends only or Private. Add titles from their page with the “Add to list” button.",
      ],
    },
    {
      id: "perfil",
      title: "6. Your profile",
      text: [
        "Your profile shows your activity and stats (hours watched, favorite genres…). It can be public or private: if private, only people you've accepted as followers can see it.",
        "Switching between public and private is possible once a week. Your username (@) can't be changed once chosen.",
        "From your profile you reach your notifications, messages and lists, and you can copy your link to invite people.",
      ],
    },
    {
      id: "social",
      title: "7. People and friends",
      text: [
        "In Discover you'll see people with tastes similar to yours, with a match percentage and the titles you have in common. The more titles you mark and rate, the better the suggestions.",
        "To invite a friend, copy your profile link (“Invite with my link” button) and send it to them.",
        "Following a public profile is instant; for a private one a request is sent that the other person accepts or declines.",
      ],
      href: "/descubrir",
      cta: "Go to Discover",
    },
    {
      id: "conversacion",
      title: "8. Conversation on each title",
      text: [
        "Every movie or series has its own conversation. You can write, reply, edit and delete your messages, flag spoilers and choose who sees them (Public, Friends or Private).",
        "Mention someone with @username and they'll get a notification. You can report inappropriate messages.",
      ],
    },
    {
      id: "mensajes",
      title: "9. Private messages and recommendations",
      text: [
        "Chat privately with people you follow each other. For someone who doesn't follow you, you can send a message request (up to 3 messages) that they accept or decline.",
        "With the “Recommend” button on a title page you send it as a card with the poster; whoever receives it can add it to Pending with one click. You can only recommend between mutual followers.",
        "There are no read receipts: nobody knows whether you've read their messages.",
      ],
      href: "/mensajes",
      cta: "Go to Messages",
    },
    {
      id: "avisos",
      title: "10. Notifications and blocking",
      text: [
        "A red dot on your photo alerts you to new followers, requests, replies, mentions, messages and recommendations.",
        "You can block anyone from their profile: you'll stop following each other and they won't be able to follow you or reply to you. You can unblock from Settings.",
      ],
    },
    {
      id: "accesibilidad",
      title: "11. Accessibility and appearance",
      text: [
        "The round button at the bottom right opens the accessibility panel: text size, high contrast, dyslexia-friendly font, reduce animations and underline links.",
        "At the top you can switch between light/dark theme and language (Spanish/English).",
      ],
    },
  ],
};

export function getGuide(lang: Lang) {
  return lang === "en" ? en : es;
}
