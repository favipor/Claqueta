import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getTrending } from "@/lib/tmdb";

// Mapa de la web para Google: páginas principales y los títulos en tendencia de la semana
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/peliculas`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/guia`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/aviso-legal`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.1 },
  ];
  const trending = await getTrending("es", "week", "all").catch(() => []);
  const titles: MetadataRoute.Sitemap = trending.map((t) => ({
    url: `${SITE_URL}/titulo/${t.media_type}/${t.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...pages, ...titles];
}

export const revalidate = 86400;
