// Esqueletos grises que se ven mientras carga una página: la web responde al instante al pulsar
// aunque los datos (TMDB, Supabase) tarden un poco. Decorativos: ocultos para lectores de pantalla.
const pulse = "animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800";

export function CardGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className={`${pulse} aspect-[2/3] w-full`} />
          <div className={`${pulse} h-3.5 w-3/4`} />
          <div className={`${pulse} h-3 w-1/2`} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className={`${pulse} h-8 w-48`} />
      <div className={`${pulse} h-12 w-full`} />
      <CardGridSkeleton />
    </div>
  );
}

export function TitleSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl bg-neutral-200 p-6 dark:bg-neutral-900 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className={`${pulse} mx-auto aspect-[2/3] w-44 shrink-0 bg-neutral-300 dark:bg-neutral-800 sm:mx-0 sm:w-56`} />
          <div className="flex-1 space-y-4">
            <div className={`${pulse} h-9 w-2/3 bg-neutral-300 dark:bg-neutral-800`} />
            <div className={`${pulse} h-4 w-1/3 bg-neutral-300 dark:bg-neutral-800`} />
            <div className="space-y-2 pt-2">
              <div className={`${pulse} h-3.5 w-full bg-neutral-300 dark:bg-neutral-800`} />
              <div className={`${pulse} h-3.5 w-11/12 bg-neutral-300 dark:bg-neutral-800`} />
              <div className={`${pulse} h-3.5 w-4/5 bg-neutral-300 dark:bg-neutral-800`} />
            </div>
            <div className="flex gap-2 pt-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`${pulse} h-9 w-24 rounded-full bg-neutral-300 dark:bg-neutral-800`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="w-28 shrink-0 space-y-2">
            <div className={`${pulse} aspect-square w-full rounded-full`} />
            <div className={`${pulse} h-3 w-3/4`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="flex items-center gap-5">
        <div className={`${pulse} h-24 w-24 rounded-full`} />
        <div className="flex-1 space-y-3">
          <div className={`${pulse} h-7 w-48`} />
          <div className={`${pulse} h-4 w-32`} />
          <div className="flex gap-4">
            <div className={`${pulse} h-4 w-20`} />
            <div className={`${pulse} h-4 w-20`} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${pulse} h-20`} />
        ))}
      </div>
      <CardGridSkeleton count={5} />
    </div>
  );
}
