import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Qué puede indexar Google: lo público sí; lo personal (ajustes, mensajes, admin...) no
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/ajustes", "/mensajes", "/notificaciones", "/mi-lista", "/importar", "/bienvenida", "/api/", "/auth/", "/buscar"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
