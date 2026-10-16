"use client";

import { useRef, type ReactNode } from "react";
import { useI18n } from "./I18nProvider";

// Fila que se desplaza de lado (con el dedo, la rueda, o las flechas en ordenador).
export function ScrollRow({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  function move(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-lg ring-1 ring-black/10 transition hover:scale-110 sm:grid dark:bg-neutral-900/90 dark:text-white dark:ring-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg";

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 -mx-3 -my-7 overflow-x-auto scroll-smooth px-4 py-10 sm:-mx-5 sm:px-6"
      >
        {children}
      </div>
      <button type="button" onClick={() => move(-1)} aria-label={t("row.prev")} className={`${arrow} -left-3`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button type="button" onClick={() => move(1)} aria-label={t("row.next")} className={`${arrow} -right-3`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
