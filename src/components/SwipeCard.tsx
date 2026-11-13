"use client";

import Image from "next/image";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { img, type TmdbItem } from "@/lib/tmdb";

// Las mismas opciones que en cualquier ficha (más «no me interesa» para pasar a la siguiente)
export type Choice = "visto" | "viendo" | "pendiente" | "skip";

// Hacia dónde sale cada tarjeta según lo elegido
const OUT: Record<Choice, { x: number; y: number; rotate: number }> = {
  visto: { x: 460, y: 0, rotate: 18 },
  skip: { x: -460, y: 0, rotate: -18 },
  pendiente: { x: 0, y: -560, rotate: 0 },
  viendo: { x: 0, y: 560, rotate: 0 },
};

// Una tarjeta con su PROPIA posición: así la que sale y la que entra nunca se mezclan
export function SwipeCard({ item, onChoose, reduce, L, tabSpace = false }: { item: TmdbItem; onChoose: (c: Choice) => void; reduce: boolean; L: boolean; tabSpace?: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const seen = useTransform(x, [30, 140], [0, 1]);
  const skip = useTransform(x, [-140, -30], [1, 0]);
  const want = useTransform(y, [-140, -30], [1, 0]);
  const watching = useTransform(y, [30, 140], [0, 1]);
  const poster = img(item.poster_path, "w500");

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 110) onChoose("visto");
    else if (info.offset.x < -110) onChoose("skip");
    else if (info.offset.y < -110) onChoose("pendiente");
    else if (info.offset.y > 110) onChoose("viendo");
  }

  return (
    <motion.div
      drag={!reduce}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      style={{ x, y, rotate }}
      initial={reduce ? false : { scale: 0.94, y: 14, opacity: 0.5 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      // La dirección de salida llega por «custom» desde AnimatePresence (la tarjeta que sale ya no recibe props nuevas)
      variants={{ out: (c: Choice) => (reduce ? { opacity: 0 } : { ...OUT[c ?? "skip"], opacity: 0, transition: { duration: 0.32, ease: "easeIn" } }) }}
      exit="out"
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl bg-neutral-800 shadow-2xl active:cursor-grabbing"
    >
      {poster && <Image src={poster} alt={item.title} fill sizes="384px" priority className="pointer-events-none object-cover" />}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-20 text-white ${tabSpace ? "pb-14" : ""}`}>
        <p className="text-2xl font-extrabold leading-tight drop-shadow">{item.title}</p>
        <p className="mt-1 text-sm text-white/80">
          {item.media_type === "movie" ? (L ? "Movie" : "Película") : L ? "Series" : "Serie"}
          {item.year ? ` · ${item.year}` : ""}
        </p>
      </div>
      <motion.span style={{ opacity: seen }} className="absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400">
        {L ? "WATCHED" : "VISTO"}
      </motion.span>
      <motion.span style={{ opacity: skip }} className="absolute right-5 top-6 rotate-12 rounded-xl border-4 border-neutral-300 px-3 py-1 text-2xl font-black text-neutral-200">
        {L ? "NOPE" : "PASO"}
      </motion.span>
      <motion.span style={{ opacity: want }} className="absolute inset-x-0 top-1/3 mx-auto w-max rounded-xl border-4 border-orange-400 px-3 py-1 text-2xl font-black text-orange-400">
        {L ? "PENDING" : "PENDIENTE"}
      </motion.span>
      <motion.span style={{ opacity: watching }} className="absolute inset-x-0 top-1/3 mx-auto w-max rounded-xl border-4 border-amber-300 px-3 py-1 text-2xl font-black text-amber-300">
        {L ? "WATCHING" : "VIENDO"}
      </motion.span>
    </motion.div>
  );
}

// Nota obligatoria sobre la tarjeta: del 1 al 10, no se pasa a la siguiente hasta elegir
export function RatePanel({ title, onRate, L }: { title: string; onRate: (n: number) => void; L: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label={L ? "Rate it" : "Puntúala"}
      className="absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-neutral-950/95 p-4 text-white shadow-2xl ring-2 ring-amber-400/80 backdrop-blur"
    >
      <p className="text-sm font-semibold">
        {L ? "Rate" : "¿Qué nota le das a"} <b>{title}</b>?
      </p>
      <p className="text-xs text-white/60">{L ? "Pick a score to continue" : "Elige una nota para seguir"}</p>
      <div className="mt-2 grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
          <button key={n} type="button" onClick={() => onRate(n)} className="rounded-lg bg-white/10 py-2 text-sm font-bold transition hover:scale-110 hover:bg-amber-400 hover:text-amber-950">
            {n}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
