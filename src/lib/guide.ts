import type { Lang } from "./dict";

export type GuideSection = {
  id: string; title: string; text: string[]; tip?: string; href?: string; cta?: string;
};
type Guide = { intro: string; contents: string; back: string; sections: GuideSection[] };
const guides: Record<Lang, Guide> = {
  "es": {
    "intro": "Tu diario de películas y series, paso a paso. Empieza por un título y descubre el resto a tu ritmo.",
    "contents": "En esta guía",
    "back": "Volver al índice",
    "sections": [
      {
        "id": "empezar",
        "title": "1. Empieza en un minuto",
        "text": [
          "Busca un título, por ejemplo «Dark», y abre su ficha. Puedes explorar sin cuenta; para guardar tu seguimiento, inicia sesión y completa tu perfil.",
          "Pulsa «Pendiente» para guardarlo o «Visto» si ya lo has visto. Elige tu puntuación en las estrellas: se guarda al cambiarla.",
          "Abre «Mi lista» para encontrarlo después. En una serie, despliega sus temporadas para marcar los episodios que llevas."
        ],
        "href": "/buscar",
        "cta": "Buscar un título"
      },
      {
        "id": "acceso",
        "title": "2. Qué puedes hacer sin cuenta",
        "text": [
          "Sin iniciar sesión puedes explorar el catálogo, buscar títulos y personas, consultar fichas y reparto, y abrir los perfiles y listas que sean públicos.",
          "Necesitas cuenta para guardar estados y puntuaciones, escribir notas, seguir episodios, usar Mi lista y Calendario, importar o exportar, crear listas e interactuar con otras personas.",
          "Al registrarte, elige tu @usuario y la privacidad del perfil. El @usuario es definitivo; el nombre visible, la foto y la biografía se editan en Ajustes."
        ],
        "href": "/login",
        "cta": "Entrar o crear cuenta"
      },
      {
        "id": "catalogo",
        "title": "3. Encuentra algo que te apetezca ver",
        "text": [
          "En Películas y Series, explora las tendencias y filtra por género, incluido anime y documentales. Ordena por popularidad, nota o fecha de estreno; pulsa «Ver más» para seguir explorando.",
          "Con cuenta, configura tus plataformas en Ajustes y activa el filtro de tus plataformas en el catálogo. La disponibilidad que se muestra corresponde a España y depende de TMDB.",
          "En el buscador escribe un título o, para encontrar personas, un nombre o @usuario de al menos dos caracteres. Las fichas del reparto permiten consultar su filmografía.",
          "En la portada puede aparecer «Para ti» cuando tienes títulos puntuados con un 7 o más: sugiere títulos relacionados que aún no has guardado."
        ],
        "href": "/peliculas",
        "cta": "Explorar películas"
      },
      {
        "id": "ficha",
        "title": "4. Consulta dónde verlo y qué viene después",
        "text": [
          "Abre una ficha para leer la sinopsis, ver el reparto y consultar el tráiler y las plataformas, si TMDB tiene esos datos.",
          "La nota de TMDB y la media de Claqueta son distintas. La media de la comunidad reúne puntuaciones; no muestra las notas de texto privadas. Puede no estar disponible sin sesión.",
          "Consulta «¿Qué viene después?» para ver próximos episodios, temporadas, el estado de la serie o posibles secuelas. Si no hay fecha confirmada, no se inventa una. Al final encontrarás títulos similares."
        ]
      },
      {
        "id": "seguimiento",
        "title": "5. Guarda, puntúa y anota",
        "text": [
          "Elige «Pendiente», «Viendo», «Visto» o «Volver a ver». Pulsar otra vez el estado seleccionado lo quita; los cambios de estado y puntuación se guardan automáticamente.",
          "La escala de puntuación es de 0 a 10 en pasos de 0,5. El selector usa medias estrellas; con teclado puedes ajustar la nota con las flechas y quitarla con Supr. El extremo inferior representa «Sin nota».",
          "Escribe en «Notas privadas» y pulsa «Guardar». Ese texto solo lo ves tú. Tus puntuaciones y estados pueden verse en tu perfil según su privacidad.",
          "Si el título está Visto o Volver a ver, puedes corregir la fecha en la que lo viste. Esa fecha alimenta tu diario y el resumen anual.",
          "También puedes marcar y puntuar desde el acceso rápido de una carátula; en móvil, mantenla pulsada medio segundo."
        ]
      },
      {
        "id": "episodios",
        "title": "6. Retoma una serie donde la dejaste",
        "text": [
          "En la ficha de una serie, abre una temporada y marca o desmarca sus capítulos. Solo puedes marcar como vistos los que ya se han emitido.",
          "«Marcar hasta aquí» incluye el capítulo elegido y los anteriores, también los de temporadas previas. Los especiales se tratan por separado.",
          "Marcar una serie como «Visto» marca sus capítulos emitidos de las temporadas normales. Una temporada con capítulos futuros puede seguir en «Viendo».",
          "Si pasas una serie de Visto a Pendiente, o le quitas ese estado, se borra su progreso por episodios. Hazlo solo si quieres reiniciar el seguimiento."
        ]
      },
      {
        "id": "milista",
        "title": "7. Organiza Mi lista",
        "text": [
          "Abre «Mi lista» y combina estado, tipo y género. Ordena por Más recientes, Nota más alta, Nota más baja, Título (A-Z) o Duración (mayor a menor). El género filtra; no es un criterio de ordenación.",
          "Los filtros se recuerdan. Si no encuentras algo, vuelve a «Todo» y revisa el resto de filtros. Las series en curso muestran su progreso.",
          "Si no sabes qué elegir, usa la selección al azar de tus pendientes."
        ],
        "href": "/mi-lista",
        "cta": "Abrir Mi lista"
      },
      {
        "id": "importar",
        "title": "8. Trae tu lista y descarga una copia",
        "text": [
          "Desde «Importar», sube un archivo .xlsx o .csv. En Excel se utiliza la primera hoja con títulos reconocibles. Descomprime antes los archivos .zip de otras aplicaciones.",
          "Para tu propia hoja, usa NOMBRE, TIPO, VISUALIZACION y NOTA. Ejemplo: Dark | Serie | Viendo | 8,5. También se reconocen otros encabezados como TÍTULO. Revisa especialmente el tipo de los documentales.",
          "Se reconocen CSV de Letterboxd, IMDb y TV Time con sus columnas de título. En Letterboxd, las notas sobre 5 se convierten a 10; un 0 importado se trata como ausencia de nota. Un archivo cuyo nombre contiene watchlist se interpreta como pendientes en Letterboxd e IMDb.",
          "Revisa las coincidencias con TMDB y omite las dudosas antes de pulsar «Importar». Los títulos que ya tienen un estado guardado en Claqueta se omiten, sin sobrescribirlos.",
          "«Exportar a Excel» descarga hasta 5.000 títulos e incluye las notas privadas: tenlo en cuenta antes de compartir el archivo. No es una copia completa de la cuenta: no incluye mensajes, listas personalizadas ni el detalle por episodio, y la importación no restaura las notas privadas exportadas."
        ],
        "href": "/importar",
        "cta": "Importar mi lista"
      },
      {
        "id": "listas",
        "title": "9. Prepara una lista para cada plan",
        "text": [
          "En las listas de tu perfil, pulsa «Nueva lista», ponle un nombre y, si quieres, una descripción. Por ejemplo: «Domingo de ciencia ficción». Puedes mezclar películas y series y cambiar el orden.",
          "Desde una ficha, usa «Añadir a lista» para elegir dónde guardarla. Mi lista y estas listas personalizadas son apartados distintos.",
          "Puedes crear hasta 50 listas, con hasta 500 títulos cada una. El nombre admite 60 caracteres y la descripción, 200. Elige Público, Amigos o Privado; consulta las reglas de visibilidad más abajo."
        ]
      },
      {
        "id": "calendario",
        "title": "10. Consulta tu diario y los próximos estrenos",
        "text": [
          "En «Calendario», cambia de mes y elige «Todo», «Estrenos» o «Lo que vi». Puedes añadir «Estrenos de cine» a la vista.",
          "El diario usa la fecha que guardas en el título y las fechas en las que marcas capítulos. Los estrenos de lo que sigues dependen de los datos disponibles en TMDB."
        ],
        "href": "/calendario",
        "cta": "Abrir Calendario"
      },
      {
        "id": "perfil",
        "title": "11. Consulta tu perfil y tu resumen del año",
        "text": [
          "Tu perfil reúne títulos, puntuaciones, estadísticas y listas. Desde él puedes abrir tu resumen anual, cambiar de año y compartir su enlace.",
          "Las horas son estimaciones basadas en duraciones disponibles. El resumen usa la fecha de visionado; si falta, usa la última actualización del título. Los episodios se cuentan según cuándo los marcaste.",
          "Con «Invitar con mi enlace» compartes una invitación. Si alguien completa su registro a través de ella, se intenta que empiece siguiéndote; si tu perfil es privado, se aplican las solicitudes habituales."
        ]
      },
      {
        "id": "social",
        "title": "12. Encuentra personas y sigue su actividad",
        "text": [
          "En «Amigos», alterna entre «Actividad» y «Descubrir gente». La actividad muestra lo que marcan y puntúan las personas que sigues si han activado «Mostrar mi actividad».",
          "Descubrir compara géneros, títulos en común y puntuaciones para sugerir afinidad. Los perfiles privados no muestran porcentaje de afinidad ni títulos en común en este apartado.",
          "Pulsa «Seguir» en un perfil público para seguirlo al momento. En uno privado, espera a que acepte tu solicitud. Puedes aceptar o rechazar las tuyas desde Notificaciones.",
          "«Mostrar mi actividad» se cambia en Ajustes: desactivarlo oculta tus cambios en el apartado Actividad de otras personas, pero no convierte tu perfil en privado."
        ],
        "href": "/actividad",
        "cta": "Ir a Amigos"
      },
      {
        "id": "conversacion",
        "title": "13. Comenta sin estropear la historia",
        "text": [
          "Abre la conversación de una ficha para escribir o responder. Puedes editar o borrar tus comentarios y elegir Público, Amigos o Privado.",
          "Marca «Spoiler» si revelas parte de la historia: el texto se oculta hasta que alguien decide mostrarlo. Esto no restringe quién puede acceder al comentario; para eso está la visibilidad.",
          "Una mención con @usuario puede generar un aviso si esa persona tiene permiso para ver el mensaje. Denuncia los comentarios inadecuados. Las respuestas quedan agrupadas bajo el comentario principal."
        ]
      },
      {
        "id": "mensajes",
        "title": "14. Habla en privado y recomienda",
        "text": [
          "Entre seguidores mutuos, los mensajes se abren directamente. Si no os seguís mutuamente, puedes enviar una solicitud con hasta 3 mensajes mientras está pendiente. Aceptarla o responder permite continuar; si la rechazan, no puedes insistir con otra.",
          "En una ficha, pulsa «Recomendar» para enviar una tarjeta a alguien con quien te sigues mutuamente. Quien la recibe puede añadirla a pendientes. También puedes compartir el título por WhatsApp.",
          "Los mensajes admiten hasta 1.000 caracteres y el texto de una recomendación, 300. No hay confirmaciones de lectura: la otra persona no ve si has leído el mensaje."
        ],
        "href": "/mensajes",
        "cta": "Abrir Mensajes"
      },
      {
        "id": "privacidad",
        "title": "15. Decide quién ve cada cosa",
        "text": [
          "Perfil público: sus títulos, puntuaciones y estadísticas pueden consultarse sin cuenta. Perfil privado: su contenido se reserva a ti y a tus seguidores aceptados; la identidad básica, como nombre, foto y biografía, puede seguir apareciendo al buscar o descubrir personas.",
          "En comentarios y listas, «Público» permite acceso general si el perfil es público; si el perfil es privado, lo limita a sus seguidores aceptados. «Amigos» significa quienes te siguen y han sido aceptados: no exige seguimiento mutuo. «Privado» solo lo ve quien lo crea.",
          "Las notas de texto de cada título siempre son privadas. Los mensajes privados son visibles para quienes participan. Una puntuación no es una nota privada: puede mostrarse en el perfil y contribuir a la media de la comunidad.",
          "Puedes cambiar entre perfil público y privado una vez cada 7 días. Compartir un enlace no da acceso a contenido privado ni evita los bloqueos."
        ],
        "href": "/ajustes",
        "cta": "Revisar Ajustes"
      },
      {
        "id": "avisos",
        "title": "16. Gestiona los avisos y los bloqueos",
        "text": [
          "El indicador de tu cuenta avisa de notificaciones y solicitudes pendientes. En Notificaciones puedes revisar seguidores, respuestas, menciones, mensajes, recomendaciones y avisos de nuevos capítulos.",
          "En Ajustes puedes activar «Avisos en el móvil» si el dispositivo y la configuración del servicio lo permiten. Necesitas dar permiso; en iPhone puede ser necesario instalar la web en la pantalla de inicio.",
          "Bloquea desde el perfil de una persona. Se eliminan los seguimientos en ambos sentidos y se restringen el acceso entre perfiles, los mensajes y las respuestas. Desbloquear desde Ajustes no restaura los seguimientos."
        ],
        "href": "/notificaciones",
        "cta": "Ver Notificaciones"
      },
      {
        "id": "accesibilidad",
        "title": "17. Ajusta la web a tu manera",
        "text": [
          "Cambia entre español e inglés desde el selector de idioma de la navegación. El botón de tema está abajo a la derecha, encima del de accesibilidad.",
          "Abre el panel de accesibilidad para ajustar el tamaño de letra, el contraste, la fuente para dislexia, las animaciones y el subrayado de enlaces. Las preferencias de apariencia se guardan en este navegador.",
          "Puedes instalar Claqueta desde el botón de instalación cuando el navegador lo permita. El vídeo «Ver cómo funciona» tiene subtítulos y su transcripción, y puedes pausarlo o silenciarlo cuando quieras."
        ]
      }
    ]
  },
  "en": {
    "intro": "Your movie and series diary, step by step. Start with one title and explore the rest at your own pace.",
    "contents": "In this guide",
    "back": "Back to contents",
    "sections": [
      {
        "id": "empezar",
        "title": "1. Get started in a minute",
        "text": [
          "Search for a title, such as “Dark”, and open its page. Browsing needs no account; to save your progress, sign in and complete your profile.",
          "Choose “Pending” to save it or “Watched” if you have seen it. Set your star rating: changes save automatically.",
          "Open “My list” to find it later. For a series, expand its seasons and mark the episodes you have seen."
        ],
        "href": "/buscar",
        "cta": "Find a title"
      },
      {
        "id": "acceso",
        "title": "2. What you can do without an account",
        "text": [
          "Without signing in you can browse the catalogue, search titles and people, view title and cast pages, and open public profiles and lists.",
          "An account is needed to save statuses and ratings, write private notes, track episodes, use My list and Calendar, import or export, create lists and interact with people.",
          "During setup, choose your @username and profile privacy. Your @username is permanent; your display name, photo and bio can be edited in Settings."
        ],
        "href": "/login",
        "cta": "Sign in or create an account"
      },
      {
        "id": "catalogo",
        "title": "3. Find something to watch",
        "text": [
          "In Movies and Series, explore trends and filter by genre, including anime and documentaries. Sort by popularity, rating or release date; choose “Show more” to continue.",
          "With an account, choose your streaming services in Settings and enable the catalogue filter for your services. Availability is for Spain and depends on TMDB.",
          "Search a title or, to find people, a name or @username with at least two characters. Cast pages let you explore filmographies.",
          "The home page can show “For you” after you rate titles 7 or above: it suggests related titles you have not saved yet."
        ],
        "href": "/peliculas",
        "cta": "Explore movies"
      },
      {
        "id": "ficha",
        "title": "4. Check where to watch and what comes next",
        "text": [
          "Open a title page to read the synopsis, explore the cast, and check trailers and streaming services when TMDB provides them.",
          "The TMDB rating and Claqueta average are separate. The community average aggregates ratings and never shows private written notes. It may be unavailable when signed out.",
          "Check “What's next?” for episodes, seasons, series status or possible sequels. No confirmed date means no date is invented. Related titles appear further down."
        ]
      },
      {
        "id": "seguimiento",
        "title": "5. Save, rate and take notes",
        "text": [
          "Choose “Pending”, “Watching”, “Watched” or “Rewatch”. Selecting the same status again clears it; status and rating changes save automatically.",
          "Ratings use a 0–10 scale in 0.5 steps. The selector uses half stars; use arrow keys to adjust and Delete to clear. The lowest setting means “No rating”.",
          "Write under “Private notes” and choose “Save”. Only you see that text. Your ratings and statuses can appear on your profile according to its privacy.",
          "For Watched or Rewatch titles, you can correct the date you watched them. This date is used in your diary and annual recap.",
          "You can also track and rate from a poster's quick controls; on mobile, press and hold for half a second."
        ]
      },
      {
        "id": "episodios",
        "title": "6. Pick up a series where you left off",
        "text": [
          "On a series page, open a season and check or uncheck episodes. Only episodes that have aired can be marked watched.",
          "“Mark up to here” includes the selected episode and earlier episodes, including previous seasons. Specials are handled separately.",
          "Marking a series “Watched” marks aired episodes in regular seasons. A season with future episodes may remain “Watching”.",
          "Changing a Watched series to Pending, or clearing that status, clears its episode progress. Do this only when you want to reset tracking."
        ]
      },
      {
        "id": "milista",
        "title": "7. Organise My list",
        "text": [
          "Open “My list” and combine status, type and genre filters. Sort by Most recent, Highest rated, Lowest rated, Title (A-Z) or Length (longest first). Genre is a filter, not a sort order.",
          "Filters are remembered. If something is missing, choose “All” and check the other filters. Series you are watching show their progress.",
          "If you cannot decide, use the random pick from your pending titles."
        ],
        "href": "/mi-lista",
        "cta": "Open My list"
      },
      {
        "id": "importar",
        "title": "8. Import your list and download a copy",
        "text": [
          "In “Import”, upload an .xlsx or .csv file. For Excel, the first sheet with recognisable titles is used. Unzip exports from other apps first.",
          "For your own sheet, use NOMBRE, TIPO, VISUALIZACION and NOTA. Example: Dark | Serie | Viendo | 8.5. Other title headers are recognised too. Check documentary types carefully.",
          "CSV files from Letterboxd, IMDb and TV Time are recognised by their title columns. Letterboxd ratings out of 5 are converted to 10; imported zero means no rating. Letterboxd and IMDb filenames containing watchlist are treated as pending lists.",
          "Review TMDB matches and skip uncertain ones before choosing “Import”. Titles that already have a saved status in Claqueta are skipped without overwriting them.",
          "“Export to Excel” downloads up to 5,000 titles, including private notes: consider this before sharing. It is not a full account backup: messages, custom lists and episode details are excluded, and importing does not restore exported private notes."
        ],
        "href": "/importar",
        "cta": "Import my list"
      },
      {
        "id": "listas",
        "title": "9. Make a list for each plan",
        "text": [
          "In your profile's lists, choose “New list”, add a name and optionally a description, such as “Sci-fi Sunday”. Mix movies and series and change their order.",
          "On a title page, use “Add to list” to choose where it belongs. My list and custom lists are separate features.",
          "You can create up to 50 lists of 500 titles each. Names allow 60 characters and descriptions 200. Choose Public, Friends or Private; see the visibility rules below."
        ]
      },
      {
        "id": "calendario",
        "title": "10. Check your diary and upcoming releases",
        "text": [
          "In “Calendar”, move between months and choose “Both”, “Releases” or “Watched”. You can also enable “Movie theaters”.",
          "The diary uses the date saved on each title and the dates you mark episodes. Releases for tracked titles depend on TMDB data."
        ],
        "href": "/calendario",
        "cta": "Open Calendar"
      },
      {
        "id": "perfil",
        "title": "11. View your profile and annual recap",
        "text": [
          "Your profile brings together titles, ratings, statistics and lists. Open your annual recap, choose a year and share its link.",
          "Hours are estimates based on available runtimes. The recap uses the watched date, falling back to the title's last update. Episodes use the date you marked them.",
          "Use “Invite with my link” to share an invitation. When someone completes signup through it, Claqueta tries to follow you for them; private profiles still use follow requests."
        ]
      },
      {
        "id": "social",
        "title": "12. Find people and follow their activity",
        "text": [
          "In “Friends”, switch between “Activity” and “Find people”. Activity shows updates and ratings from people you follow who have enabled “Show my activity”.",
          "Discover compares genres, shared titles and ratings to suggest affinity. Private profiles do not show an affinity percentage or shared titles here.",
          "Choose “Follow” on a public profile to follow immediately. For a private one, wait for acceptance. Accept or decline incoming requests in Notifications.",
          "Change “Show my activity” in Settings. Turning it off hides your updates from other people's Activity feed but does not make your profile private."
        ],
        "href": "/actividad",
        "cta": "Open Friends"
      },
      {
        "id": "conversacion",
        "title": "13. Discuss titles without spoiling the story",
        "text": [
          "Open a title's conversation to write or reply. You can edit or delete your comments and choose Public, Friends or Private.",
          "Mark “Spoiler” when revealing the story: the text stays hidden until someone chooses to reveal it. This does not limit who can access the comment; visibility does.",
          "An @username mention can generate a notification if that person can view the message. Report inappropriate comments. Replies are grouped under the main comment."
        ]
      },
      {
        "id": "mensajes",
        "title": "14. Chat privately and recommend titles",
        "text": [
          "Messages open directly between mutual followers. Otherwise, you can send a request with up to three messages while it is pending. Accepting or replying lets the conversation continue; after a decline, the requester cannot keep sending.",
          "Choose “Recommend” on a title page to send a card to a mutual follower. The recipient can add it to their pending titles. You can also share the title through WhatsApp.",
          "Messages allow up to 1,000 characters and recommendation notes 300. There are no read receipts: the other person cannot see whether you read a message."
        ],
        "href": "/mensajes",
        "cta": "Open Messages"
      },
      {
        "id": "privacidad",
        "title": "15. Choose who sees what",
        "text": [
          "Public profile: titles, ratings and statistics can be viewed without an account. Private profile: its content is limited to you and accepted followers; basic identity such as name, photo and bio can still appear in search or discovery.",
          "For comments and lists, “Public” allows general access with a public profile; a private profile limits it to accepted followers. “Friends” means accepted followers and does not require mutual following. “Private” is visible only to its creator.",
          "Written title notes are always private. Private messages are visible to their participants. A rating is not a private note: it may appear on the profile and contribute to the community average.",
          "You can switch profile privacy once every seven days. Sharing a link does not grant access to private content or bypass blocks."
        ],
        "href": "/ajustes",
        "cta": "Review Settings"
      },
      {
        "id": "avisos",
        "title": "16. Manage notifications and blocking",
        "text": [
          "Your account indicator signals notifications and pending requests. Notifications include followers, replies, mentions, messages, recommendations and new-episode alerts.",
          "In Settings you can enable mobile notifications if your device and the service configuration support them. Permission is required; on iPhone you may need to install the site on your home screen.",
          "Block someone from their profile. Following is removed in both directions, and access between profiles, messaging and replies is restricted. Unblocking in Settings does not restore follows."
        ],
        "href": "/notificaciones",
        "cta": "View Notifications"
      },
      {
        "id": "accesibilidad",
        "title": "17. Make the site comfortable for you",
        "text": [
          "Switch between Spanish and English in the navigation language selector. The theme button is at the bottom right, above accessibility.",
          "Open the accessibility panel to adjust text size, contrast, the dyslexia font, motion and link underlining. Appearance preferences are saved in this browser.",
          "Install Claqueta using the install button when supported by your browser. The “How it works” video has captions and a transcript, and you can pause or mute it at any time."
        ]
      }
    ]
  }
};
export function getGuide(lang: Lang): Guide { return guides[lang]; }
