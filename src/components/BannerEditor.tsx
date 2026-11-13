"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { bannerSuggestions, findBackdrops, setBanner } from "@/app/banner-actions";
import { BANNER_GRADIENTS } from "@/lib/banner";
import { img, type BackdropHit } from "@/lib/tmdb";
import { BannerBg } from "./BannerBg";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

// «Personalizar tarjeta»: eliges el banner que ve la gente en tu perfil y en Descubrir gente:
// un color o la imagen de una peli o serie. Con vista previa en vivo.
export function BannerEditor({ current, username, displayName, avatarUrl }: { current: string | null; username: string; displayName: string | null; avatarUrl: string | null }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const router = useRouter();
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"color" | "title">(current?.startsWith("b:") ? "title" : "color");
  const [value, setValue] = useState<string | null>(current);
  const [sugs, setSugs] = useState<BackdropHit[] | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BackdropHit[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setValue(current);
    setErr(false);
    if (!sugs) bannerSuggestions().then(setSugs).catch(() => setSugs([]));
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function search(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) return setHits(null);
    timer.current = setTimeout(() => findBackdrops(v).then(setHits).catch(() => setHits([])), 350);
  }

  async function save() {
    setSaving(true);
    setErr(false);
    const r = await setBanner(value).catch(() => ({ ok: false }));
    setSaving(false);
    if (!r.ok) return setErr(true);
    setOpen(false);
    router.refresh();
  }

  const tile = (h: BackdropHit) => {
    const v = `b:${h.backdrop_path}`;
    const on = value === v;
    return (
      <button
        key={`${h.media_type}-${h.id}`}
        type="button"
        onClick={() => setValue(v)}
        aria-pressed={on}
        className={`group relative aspect-video overflow-hidden rounded-xl bg-neutral-200 text-left dark:bg-neutral-800 ${on ? "ring-4 ring-brand-fg" : "ring-1 ring-black/5 dark:ring-white/10"}`}
      >
        <Image src={img(h.backdrop_path, "w300")!} alt="" fill sizes="180px" className="object-cover transition group-hover:scale-105" />
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-bold text-white">
          {h.title}
          {h.year ? ` · ${h.year}` : ""}
        </span>
        {on && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-black text-white shadow">✓</span>}
      </button>
    );
  };

  const tabBtn = (id: "color" | "title", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === id ? "bg-brand text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        🎨 {L ? "Customise card" : "Personalizar tarjeta"}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[96] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={L ? "Customise your card" : "Personaliza tu tarjeta"}
                  onClick={(e) => e.stopPropagation()}
                  initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
                  className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white text-neutral-900 shadow-2xl sm:rounded-3xl dark:bg-neutral-900 dark:text-neutral-100"
                >
                  <div className="flex items-center justify-between px-5 pb-2 pt-4">
                    <h2 className="text-lg font-extrabold">🎨 {L ? "Your card" : "Tu tarjeta"}</h2>
                    <button type="button" onClick={() => setOpen(false)} aria-label={L ? "Close" : "Cerrar"} className="grid h-9 w-9 place-items-center rounded-full text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      ×
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
                    {/* Vista previa: así te ve la gente en Descubrir gente */}
                    <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="relative h-24 overflow-hidden">
                        <BannerBg banner={value} username={username} />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/45" aria-hidden="true" />
                      </div>
                      <div className="px-4 pb-4">
                        <div className="relative z-10 -mt-8 w-max rounded-full ring-4 ring-white dark:ring-neutral-900">
                          <Avatar url={avatarUrl} size={64} />
                        </div>
                        <p className="mt-2 truncate font-extrabold">{displayName ?? username}</p>
                        <p className="truncate text-sm text-neutral-500">@{username}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-center text-xs text-neutral-500">{L ? "This is how people see you in Find people and on your profile." : "Así te ve la gente en Descubrir gente y en tu perfil."}</p>

                    <div className="mt-4 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800" role="tablist">
                      {tabBtn("color", L ? "🎨 Colour" : "🎨 Color")}
                      {tabBtn("title", L ? "🎬 Movie or series" : "🎬 Película o serie")}
                    </div>

                    {tab === "color" ? (
                      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                        <button
                          type="button"
                          onClick={() => setValue(null)}
                          aria-pressed={value === null}
                          className={`grid aspect-square place-items-center rounded-2xl border-2 border-dashed text-[11px] font-bold text-neutral-500 ${value === null ? "border-brand-fg text-brand-fg" : "border-neutral-300 dark:border-neutral-700"}`}
                        >
                          {L ? "Auto" : "Automático"}
                        </button>
                        {Object.entries(BANNER_GRADIENTS).map(([k, cls]) => {
                          const on = value === `g:${k}`;
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setValue(`g:${k}`)}
                              aria-pressed={on}
                              aria-label={k}
                              title={k}
                              className={`relative aspect-square rounded-2xl bg-gradient-to-br ${cls} shadow-sm transition hover:scale-105 ${on ? "ring-4 ring-brand-fg ring-offset-2 ring-offset-white dark:ring-offset-neutral-900" : ""}`}
                            >
                              {on && <span className="absolute inset-0 grid place-items-center text-lg font-black text-white drop-shadow">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <input
                          type="search"
                          value={q}
                          onChange={(e) => search(e.target.value)}
                          placeholder={L ? "Search a movie or series…" : "Busca una peli o serie…"}
                          className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950"
                        />
                        <p className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-neutral-500">{hits ? (L ? "Results" : "Resultados") : L ? "From your favourites" : "De tus favoritas"}</p>
                        {(hits ?? sugs) === null ? (
                          <div className="grid grid-cols-2 gap-2">
                            {[0, 1, 2, 3].map((i) => (
                              <span key={i} className="aspect-video animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                            ))}
                          </div>
                        ) : (hits ?? sugs)!.length === 0 ? (
                          <p className="py-6 text-center text-sm text-neutral-500">
                            {hits ? (L ? "Nothing found." : "No hay resultados.") : L ? "Mark and rate some titles, or search above." : "Marca y puntúa algunos títulos, o busca arriba."}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">{(hits ?? sugs)!.map(tile)}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
                    {err && <p className="mr-auto text-xs text-red-600">{L ? "Couldn't save. Try again." : "No se ha podido guardar. Inténtalo otra vez."}</p>}
                    <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                      {L ? "Cancel" : "Cancelar"}
                    </button>
                    <button type="button" disabled={saving || value === current} onClick={save} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">
                      {saving ? "…" : L ? "Save" : "Guardar"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
