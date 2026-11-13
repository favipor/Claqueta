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
      <div className="absolute -inset-x-40 -inset-y-24 flex -rotate-6 justify-center gap-3 opacity-80">
        {columns.map((col, c) => (
          <div key={c} className={`${c >= 8 ? "hidden lg:block" : c >= 4 ? "hidden sm:block" : ""} w-36 shrink-0 sm:w-44 xl:w-56`}>
            <div
              className={`flex flex-col ${c % 2 ? "marquee-down" : "marquee-up"}`}
              style={{ animationDuration: `${70 + c * 7}s` }}
            >
              {[...col, ...col].map((p, i) => (
                <div key={i} className="relative mb-3 aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg">
                  {/* En el móvil basta con la versión pequeña (pesa unas 3 veces menos) */}
                  <picture>
                    <source media="(min-width: 640px)" srcSet={img(p, "w342")!} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(p, "w185")!} alt="" loading={i < 3 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  </picture>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Velo oscuro casi neutro con un toque leve de la marca: deja ver bien las carátulas */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-950/60 via-brand/35 to-neutral-950/60" />
      {/* Refuerzo suave en el centro para que el texto se lea siempre */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.5),transparent_70%)]" />
    </div>
  );
}
