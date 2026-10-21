"use client";

import { useEffect, useRef, useState } from "react";
import { TitleCard } from "./TitleCard";
import { useI18n } from "./I18nProvider";
import type { Status } from "@/lib/dict";

const PAGE = 20; // títulos que se muestran de golpe

export type ListRow = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  status: Status | null;
  rating: number | null;
  progress?: { value: number; total: number; label: string };
};

// Rejilla de «Mi lista»: primero 20, un botón «Ver más» y, a partir de ahí, scroll infinito.
// La página pasa una `key` distinta al cambiar estado/tipo/orden/género, así que todo se reinicia.
export function MyListGrid({ rows }: { rows: ListRow[] }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(PAGE);
  const [started, setStarted] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !started || shown >= rows.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown((n) => n + PAGE);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started, shown, rows.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {rows.slice(0, shown).map((r, i) => (
          <TitleCard
            key={`${r.media_type}-${r.tmdb_id}`}
            id={r.tmdb_id}
            type={r.media_type}
            title={r.title}
            posterPath={r.poster_path}
            status={r.status}
            rating={r.rating}
            index={i % PAGE}
            progress={r.progress}
          />
        ))}
      </div>
      <div ref={sentinel} className="py-8 text-center text-sm text-neutral-500">
        {!started && shown < rows.length && (
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              setShown((n) => n + PAGE);
            }}
            className="rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
          >
            {t("catalog.more")}
          </button>
        )}
        {shown >= rows.length && rows.length > PAGE && t("catalog.end")}
      </div>
    </>
  );
}
