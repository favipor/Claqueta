"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";

const SRC = "/guide/claqueta.mp4";

// Vídeo «Ver cómo funciona»: se abre en una ventana y empieza solo (la persona acaba de pulsar el botón).
// Un único MP4 lleva imagen, voz y música, así que pausa, saltos y subtítulos van siempre sincronizados.
export default function GuideVideoPlayer({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [ended, setEnded] = useState(false);
  const es = lang === "es";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const modal = dialog.current;
    const media = video.current;
    const overflow = document.body.style.overflow;
    modal?.showModal();
    document.body.style.overflow = "hidden";
    if (media) {
      // En desarrollo React monta dos veces: al desmontar se quita el src, aquí se repone
      if (!media.getAttribute("src")) media.setAttribute("src", SRC);
      media.volume = 0.9;
      // Si el navegador no deja sonar, arranca en silencio (el usuario puede subir el volumen)
      media.play().catch((e: DOMException) => {
        if (e.name !== "NotAllowedError") return; // p. ej. cancelado al cerrar: no es un bloqueo
        media.muted = true;
        media.play().catch(() => {});
      });
    }
    return () => {
      // Al cerrar se corta todo el sonido, también en móvil y mientras carga
      if (media) {
        media.pause();
        media.removeAttribute("src");
        media.load();
      }
      document.body.style.overflow = overflow;
      modal?.close();
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="guide-video-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto rounded-2xl bg-neutral-950 p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <h2 id="guide-video-title" className="font-bold">
          {t("video.title")}
        </h2>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label={t("a11y.close")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-2xl hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          ×
        </button>
      </div>
      <div className="relative">
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          poster="/guide/claqueta-poster.jpg"
          src={SRC}
          onError={() => setError(true)}
          onEnded={() => setEnded(true)}
          onPlay={() => setEnded(false)}
          aria-label={es ? "Vídeo: cómo funciona Claqueta" : "Video: how Claqueta works (Spanish narration)"}
          className="aspect-video w-full bg-black"
        >
          <track kind="captions" src="/guide/claqueta-es.vtt" srcLang="es" label="Español" />
          <track kind="subtitles" src="/guide/claqueta-en.vtt" srcLang="en" label="English" default={!es} />
        </video>
        {ended && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 p-4">
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/buscar"
                onClick={onClose}
                className="rounded-full bg-brand px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-brand-dark"
              >
                {es ? "Buscar mi primer título" : "Find my first title"} →
              </Link>
              <button
                type="button"
                onClick={() => {
                  const m = video.current;
                  if (m) {
                    m.currentTime = 0;
                    m.play().catch(() => {});
                  }
                }}
                className="rounded-full bg-white/15 px-6 py-3 text-base font-bold ring-1 ring-white/40 hover:bg-white/25"
              >
                ↺ {es ? "Ver otra vez" : "Watch again"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {error && (
          <p role="alert" className="rounded-xl bg-white/10 p-3 text-sm">
            {es ? "No se ha podido cargar el vídeo. Inténtalo de nuevo más tarde." : "The video could not load. Please try again later."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link href="/buscar" onClick={onClose} className="rounded-full bg-brand px-4 py-2 text-white hover:bg-brand-dark">
            {es ? "Buscar mi primer título" : "Find my first title"} →
          </Link>
          <Link href="/guia" onClick={onClose} className="rounded px-2 py-2 underline">
            {es ? "Ver la guía completa" : "Read the full guide"}
          </Link>
        </div>
      </div>
    </dialog>
  );
}
