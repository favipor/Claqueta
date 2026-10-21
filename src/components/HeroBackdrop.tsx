import Image from "next/image";
import { img } from "@/lib/tmdb";

// Fondo de carátulas que se desplazan despacio (columnas que suben y bajan).
// Hay columnas de sobra para cubrir el banner entero en cualquier ancho de pantalla.
// Decorativo: oculto para lectores de pantalla. Con "reducir movimiento" queda quieto.
export function HeroBackdrop({ posters }: { posters: string[] }) {
  const COLS = 12;
  const PER = Math.max(4, Math.ceil(posters.length / COLS));
  const columns =
    posters.length === 0
      ? []
      : Array.from({ length: COLS }, (_, c) =>
          Array.from({ length: PER }, (_, k) => posters[(k * COLS + c) % posters.length])
        );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -inset-x-40 -inset-y-24 flex -rotate-6 justify-center gap-3 opacity-55">
        {columns.map((col, c) => (
          <div key={c} className={`${c >= 8 ? "hidden lg:block" : c >= 4 ? "hidden sm:block" : ""} w-36 shrink-0 sm:w-44 xl:w-56`}>
            <div
              className={`flex flex-col ${c % 2 ? "marquee-down" : "marquee-up"}`}
              style={{ animationDuration: `${70 + c * 7}s` }}
            >
              {[...col, ...col].map((p, i) => (
                <div key={i} className="relative mb-3 aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg">
                  <Image src={img(p, "w342")!} alt="" fill sizes="(min-width: 1280px) 224px, 176px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Velo de color: deja ver las carátulas y mantiene el color de la marca */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand/80 via-brand/60 to-teal-900/80" />
      {/* Refuerzo suave en el centro para que el texto se lea siempre */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(4,47,46,0.45),transparent_75%)]" />
    </div>
  );
}
