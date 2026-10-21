// Textos legales. RELLENA los datos de LEGAL antes de publicar de verdad (nombre, correo, etc.).
// Son plantillas razonables para una web personal sin analítica ni publicidad; si el proyecto
// crece (anuncios, pagos, empresa), conviene que los revise un profesional.
export const LEGAL = {
  owner: "[Tu nombre completo]",
  id: "[Tu DNI/NIE]",
  address: "[Tu dirección o localidad, España]",
  email: "[tu-correo-de-contacto]",
  site: "Claqueta",
  updated: "21/10/2026",
};

type Section = { title: string; body: string[] };
export type LegalDoc = { title: string; intro: string; sections: Section[] };

export function getLegal(lang: "es" | "en"): Record<"privacy" | "cookies" | "terms", LegalDoc> {
  const L = LEGAL;
  if (lang === "en") {
    return {
      privacy: {
        title: "Privacy policy",
        intro: `Last updated: ${L.updated}. This explains what personal data ${L.site} handles and why.`,
        sections: [
          { title: "1. Who is responsible", body: [`${L.owner} (${L.id}), ${L.address}. Contact: ${L.email}.`] },
          {
            title: "2. What data we collect",
            body: [
              "Account data: email, name and profile photo (if you sign in with Google), username, bio and avatar.",
              "Activity you create: titles you track, ratings, lists, comments, follows, blocks, reports and private messages.",
              "Technical data needed to run the service (session, language and theme preferences).",
            ],
          },
          {
            title: "3. Why and on what legal basis",
            body: [
              "To provide the service you signed up for (account, tracking, social features): performance of a contract.",
              "To keep the service safe (rate limits, reports, moderation): legitimate interest.",
              "We do not use your data for advertising and we do not sell it.",
            ],
          },
          {
            title: "4. Who else processes your data",
            body: [
              "Supabase (database, authentication and file storage), Vercel (hosting) and Google (optional sign-in). They act as processors and may process data outside the EU under standard contractual clauses.",
              "Film and series information comes from TMDB; no personal data is sent to TMDB.",
            ],
          },
          {
            title: "5. Visibility",
            body: [
              "Your profile and activity are visible according to the privacy you choose (public or private). Ratings are private to you. Private messages are only visible to the people in the conversation.",
            ],
          },
          { title: "6. How long we keep it", body: ["While your account exists. If you delete it, your data is deleted too, except what the law requires us to keep."] },
          {
            title: "7. Your rights",
            body: [
              `You can request access, rectification, erasure, restriction, portability and objection by writing to ${L.email}. You can also export your list to Excel from the app. If you are unhappy, you can complain to the Spanish Data Protection Agency (aepd.es).`,
            ],
          },
          { title: "8. Minors", body: ["The service is intended for people aged 14 or over."] },
          { title: "9. Security", body: ["We apply access controls, encrypted connections and per-user permissions in the database. No system is 100% secure; if you find a problem, please tell us."] },
        ],
      },
      cookies: {
        title: "Cookie policy",
        intro: `Last updated: ${L.updated}.`,
        sections: [
          {
            title: "What we use",
            body: [
              "Only strictly necessary storage: a session cookie to keep you signed in (Supabase), a cookie for your language, and browser storage (localStorage) for your theme and accessibility preferences.",
              "Because these are essential for the service you request, they do not require consent.",
            ],
          },
          { title: "What we do not use", body: ["No analytics, advertising or tracking cookies. If we add any in the future, we will ask for your consent first and update this page."] },
          { title: "How to remove them", body: ["You can delete cookies and site data from your browser settings. If you do, you will be signed out and your preferences reset."] },
        ],
      },
      terms: {
        title: "Legal notice",
        intro: `Last updated: ${L.updated}.`,
        sections: [
          { title: "Owner", body: [`${L.owner} (${L.id}), ${L.address}. Contact: ${L.email}.`] },
          { title: "Purpose", body: [`${L.site} is a free website to track films and series, rate them and share them with friends.`] },
          {
            title: "Rules of use",
            body: [
              "Be respectful. Do not post illegal, offensive, harassing or spam content. We may remove content and silence or delete accounts that break these rules.",
              "Each user is responsible for what they publish.",
            ],
          },
          { title: "Content and credits", body: ["Film and series data and images are provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Trademarks and posters belong to their owners."] },
          { title: "Liability", body: ["The service is provided “as is”, without guarantees of availability. We are not responsible for the content published by users."] },
          { title: "Law", body: ["Spanish law applies."] },
        ],
      },
    };
  }
  return {
    privacy: {
      title: "Política de privacidad",
      intro: `Última actualización: ${L.updated}. Aquí te explicamos qué datos personales trata ${L.site} y para qué.`,
      sections: [
        { title: "1. Responsable", body: [`${L.owner} (${L.id}), ${L.address}. Contacto: ${L.email}.`] },
        {
          title: "2. Qué datos recogemos",
          body: [
            "Datos de cuenta: correo, nombre y foto (si entras con Google), nombre de usuario, biografía y avatar.",
            "Lo que generas al usar la web: títulos que marcas, notas, listas, comentarios, seguimientos, bloqueos, denuncias y mensajes privados.",
            "Datos técnicos necesarios para que funcione (sesión, preferencias de idioma y tema).",
          ],
        },
        {
          title: "3. Para qué y con qué base legal",
          body: [
            "Para prestarte el servicio al que te registras (cuenta, seguimiento, funciones sociales): ejecución de un contrato.",
            "Para mantener el servicio seguro (límites de uso, denuncias, moderación): interés legítimo.",
            "No usamos tus datos para publicidad y no los vendemos.",
          ],
        },
        {
          title: "4. Quién más trata tus datos",
          body: [
            "Supabase (base de datos, autenticación y archivos), Vercel (alojamiento) y Google (inicio de sesión opcional). Actúan como encargados del tratamiento y pueden tratar datos fuera de la UE bajo cláusulas contractuales tipo.",
            "La información de películas y series viene de TMDB; no se envían datos personales a TMDB.",
          ],
        },
        {
          title: "5. Visibilidad",
          body: [
            "Tu perfil y tu actividad se ven según la privacidad que elijas (público o privado). Tus notas son privadas. Los mensajes privados solo los ven las personas de la conversación.",
          ],
        },
        { title: "6. Cuánto tiempo los guardamos", body: ["Mientras tengas cuenta. Si la eliminas, se borran también tus datos, salvo lo que la ley nos obligue a conservar."] },
        {
          title: "7. Tus derechos",
          body: [
            `Puedes pedir acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo a ${L.email}. Además puedes exportar tu lista a Excel desde la app. Si no estás conforme, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`,
          ],
        },
        { title: "8. Menores", body: ["El servicio está pensado para mayores de 14 años."] },
        { title: "9. Seguridad", body: ["Aplicamos controles de acceso, conexiones cifradas y permisos por usuario en la base de datos. Ningún sistema es 100 % seguro; si encuentras un problema, avísanos."] },
      ],
    },
    cookies: {
      title: "Política de cookies",
      intro: `Última actualización: ${L.updated}.`,
      sections: [
        {
          title: "Qué usamos",
          body: [
            "Solo almacenamiento estrictamente necesario: una cookie de sesión para mantenerte conectado (Supabase), una cookie con tu idioma y el almacenamiento del navegador (localStorage) para tu tema y tus ajustes de accesibilidad.",
            "Como son imprescindibles para el servicio que solicitas, no requieren consentimiento.",
          ],
        },
        { title: "Qué no usamos", body: ["No usamos cookies de analítica, publicidad ni seguimiento. Si en el futuro las añadimos, te pediremos permiso antes y actualizaremos esta página."] },
        { title: "Cómo eliminarlas", body: ["Puedes borrar las cookies y los datos del sitio desde los ajustes de tu navegador. Si lo haces, se cerrará tu sesión y se reiniciarán tus preferencias."] },
      ],
    },
    terms: {
      title: "Aviso legal",
      intro: `Última actualización: ${L.updated}.`,
      sections: [
        { title: "Titular", body: [`${L.owner} (${L.id}), ${L.address}. Contacto: ${L.email}.`] },
        { title: "Objeto", body: [`${L.site} es una web gratuita para llevar el seguimiento de películas y series, puntuarlas y compartirlas con amigos.`] },
        {
          title: "Normas de uso",
          body: [
            "Sé respetuoso. No publiques contenido ilegal, ofensivo, acosador ni spam. Podemos retirar contenido y silenciar o eliminar cuentas que incumplan estas normas.",
            "Cada usuario es responsable de lo que publica.",
          ],
        },
        { title: "Contenido y créditos", body: ["Los datos e imágenes de películas y series los proporciona TMDB. Esta web usa la API de TMDB pero no está avalada ni certificada por TMDB. Las marcas y carteles pertenecen a sus propietarios."] },
        { title: "Responsabilidad", body: ["El servicio se ofrece «tal cual», sin garantía de disponibilidad. No nos hacemos responsables del contenido publicado por los usuarios."] },
        { title: "Legislación", body: ["Se aplica la legislación española."] },
      ],
    },
  };
}
