// Dirección pública de la web (para enlaces absolutos: vista previa al compartir, sitemap...)
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://claqueta-iota.vercel.app"
).replace(/\/$/, "");
