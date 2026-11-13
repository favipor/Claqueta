import Image from "next/image";
import { img } from "@/lib/tmdb";
import { autoGradient, parseBanner } from "@/lib/banner";

// Fondo del banner de una tarjeta de perfil: el que eligió la persona (color o imagen de una peli/serie)
// o, si no eligió, `fallback` (p. ej. vuestras carátulas en común) o un degradado según su nombre.
export function BannerBg({ banner, username, fallback, sizes = "320px" }: { banner: string | null | undefined; username: string; fallback?: React.ReactNode; sizes?: string }) {
  const b = parseBanner(banner);
  if (b?.kind === "image") {
    return (
      <div className="absolute inset-0" aria-hidden="true">
        <Image src={img(b.path, "w780")!} alt="" fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  if (b?.kind === "gradient") return <div className={`absolute inset-0 bg-gradient-to-br ${b.cls}`} aria-hidden="true" />;
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${autoGradient(username)}`} aria-hidden="true">
      {fallback}
    </div>
  );
}
