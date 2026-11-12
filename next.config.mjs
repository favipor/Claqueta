/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  // Carpeta de compilación: se puede cambiar (NEXT_DIST_DIR) para compilar de prueba sin romper «npm run dev»
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Si hay un error de tipos, Vercel NO publica (así nunca sale una versión rota)
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Sin el optimizador de Vercel: su cupo gratuito se agota (error 402 y carátulas en blanco).
    // TMDB ya sirve cada imagen en el tamaño justo (w92, w185, w342, w500, w1280).
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
};

export default nextConfig;
