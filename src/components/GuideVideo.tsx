"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ClapperIcon } from "./ClapperIcon";
import { useI18n } from "./I18nProvider";

// Vídeo-guía animado: se dibuja en la propia página (sin archivo de vídeo), así casi no pesa
// y se ve nítido en cualquier pantalla. Se abre en una ventana centrada con el fondo difuminado.

// Duración mínima de cada escena (ms): lo que tardan en verse sus animaciones.
// La intro es corta a propósito. Con voz, la escena dura lo que dure la locución.
const MIN_MS = [3500, 5500, 6500, 5500, 6500, 5500, 6500, 5500];
const SPEECH_GAP_MS = 350; // pausa tras acabar de hablar antes de pasar a la siguiente escena

type L = [string, string];
const POSTERS = [
  "from-teal-500 to-emerald-800",
  "from-amber-400 to-rose-600",
  "from-sky-400 to-indigo-700",
  "from-fuchsia-500 to-purple-800",
  "from-lime-400 to-teal-700",
];

function Poster({ i, className = "" }: { i: number; className?: string }) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br shadow-xl ring-1 ring-white/20 ${POSTERS[i % POSTERS.length]} ${className}`}
    >
      <div className="h-full w-full rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
    </div>
  );
}

const pop = (delay: number) => ({
  initial: { opacity: 0, y: 24, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { delay, duration: 0.45, ease: "easeOut" as const },
});

function Star({ fill, delay }: { fill: number; delay: number }) {
  const d = "M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z";
  return (
    <span className="relative block h-12 w-12">
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-white/25">
        <path d={d} fill="currentColor" />
      </svg>
      <motion.span
        className="absolute inset-0 overflow-hidden"
        initial={{ width: "0%" }}
        animate={{ width: `${fill * 100}%` }}
        transition={{ delay, duration: 0.25 }}
      >
        <svg viewBox="0 0 24 24" className="h-12 w-12 text-amber-300">
          <path d={d} fill="currentColor" />
        </svg>
      </motion.span>
    </span>
  );
}

function Scenes({ index, pick }: { index: number; pick: (l: L) => string }) {
  const card = "rounded-2xl bg-white/12 p-6 ring-1 ring-white/25 backdrop-blur";

  switch (index) {
    case 0:
      return (
        <div className="flex flex-col items-center gap-6">
          <div className="clap-active">
            <ClapperIcon className="h-40 w-40 text-white" />
          </div>
          <motion.h3 {...pop(0.4)} className="text-7xl font-extrabold tracking-tight">
            Claqueta
          </motion.h3>
          <motion.p {...pop(0.8)} className="text-3xl text-teal-100">
            {pick(["Tu cine, tus opiniones, tus amigos.", "Your cinema, your opinions, your friends."])}
          </motion.p>
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col items-center gap-8">
          <motion.div {...pop(0)} className="flex w-[560px] items-center gap-3 rounded-full bg-white px-6 py-4 text-3xl text-neutral-900 shadow-xl">
            <span aria-hidden="true">🔎</span>
            <motion.span initial={{ width: 0 }} animate={{ width: "auto" }} transition={{ delay: 0.5, duration: 1.2, ease: "linear" }} className="overflow-hidden whitespace-nowrap">
              Dark, Harry Potter, Dune…
            </motion.span>
          </motion.div>
          <div className="flex gap-5">
            {POSTERS.map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 120 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.18, duration: 0.5 }}>
                <Poster i={i} className="h-60 w-40" />
              </motion.div>
            ))}
          </div>
        </div>
      );
    case 2: {
      const full = 8; // 8,5 de 10
      return (
        <div className={`${card} w-[820px] space-y-6`}>
          <div className="flex gap-3">
            {[pick(["Pendiente", "Pending"]), pick(["Viendo", "Watching"]), pick(["Visto", "Watched"]), pick(["Volver a ver", "Rewatch"])].map(
              (s, i) => (
                <motion.span
                  key={s}
                  initial={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  animate={i === 2 ? { backgroundColor: "#059669", scale: [1, 1.12, 1] } : {}}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="rounded-full px-6 py-2 text-2xl font-semibold ring-1 ring-white/30"
                >
                  {s}
                </motion.span>
              )
            )}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <Star key={i} fill={i < full ? 1 : i === full ? 0.5 : 0} delay={1.6 + i * 0.16} />
            ))}
            <motion.span {...pop(3.3)} className="ml-4 text-5xl font-extrabold">
              8,5<span className="text-2xl text-white/60"> / 10</span>
            </motion.span>
          </div>
          <motion.p {...pop(3.6)} className="text-2xl text-teal-100">
            🔒 {pick(["Notas privadas: solo las ves tú", "Private notes: only you see them"])}
          </motion.p>
        </div>
      );
    }
    case 3:
      return (
        <div className={`${card} w-[820px] space-y-5`}>
          <p className="text-3xl font-bold">{pick(["Dark · progreso por temporada", "Dark · progress by season"])}</p>
          {[
            [pick(["Temporada 1", "Season 1"]), 100],
            [pick(["Temporada 2", "Season 2"]), 100],
            [pick(["Temporada 3", "Season 3"]), 55],
          ].map(([name, pct], i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-2xl">
                <span>{name}</span>
                <span className="text-teal-100">{pct}%</span>
              </div>
              <div className="h-5 overflow-hidden rounded-full bg-white/20">
                <motion.div className="h-full rounded-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.5 + i * 0.6, duration: 1 }} />
              </div>
            </div>
          ))}
          <motion.p {...pop(3)} className="text-2xl text-teal-100">
            {pick(["«Marcar hasta aquí» marca todos los capítulos anteriores", "“Mark up to here” marks all previous episodes"])}
          </motion.p>
        </div>
      );
    case 4:
      return (
        <div className="flex items-center gap-10">
          <div className="relative h-72 w-64">
            {[0, 1, 2, 3].map((i) => (
              <motion.div key={i} className="absolute" style={{ left: i * 26, top: i * 12 }} initial={{ opacity: 0, y: -60, rotate: -8 }} animate={{ opacity: 1, y: 0, rotate: i * 3 - 4 }} transition={{ delay: 0.3 + i * 0.35, duration: 0.5 }}>
                <Poster i={i} className="h-60 w-40" />
              </motion.div>
            ))}
          </div>
          <div className="space-y-4">
            <motion.p {...pop(0.2)} className="text-5xl font-extrabold">
              {pick(["Maratón Harry Potter", "Harry Potter marathon"])}
            </motion.p>
            <motion.p {...pop(0.8)} className="text-2xl text-teal-100">
              {pick(["Películas y series mezcladas, en el orden que quieras", "Movies and series mixed, in any order you like"])}
            </motion.p>
            <motion.div {...pop(1.4)} className="flex gap-3 text-2xl">
              {[pick(["Público", "Public"]), pick(["Amigos", "Friends"]), pick(["Privado", "Private"])].map((v, i) => (
                <span key={v} className={`rounded-full px-5 py-2 ring-1 ring-white/30 ${i === 1 ? "bg-white text-teal-800" : "bg-white/10"}`}>
                  {v}
                </span>
              ))}
            </motion.div>
            <motion.p {...pop(2.2)} className="text-2xl text-white/80">
              ⇅ {pick(["Ordena Mi lista por nota, género…", "Sort My list by rating, genre…"])} · 📄 {pick(["Exporta a Excel", "Export to Excel"])}
            </motion.p>
          </div>
        </div>
      );
    case 5:
      return (
        <div className="flex flex-col items-center gap-8">
          <div className="flex gap-6">
            {[
              ["Ana", 92],
              ["Luis", 87],
              ["Marta", 76],
            ].map(([n, p], i) => (
              <motion.div key={n} {...pop(0.3 + i * 0.4)} className={`${card} w-60 space-y-3 text-center`}>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-teal-300 text-4xl font-bold text-teal-900">{String(n)[0]}</div>
                <p className="text-3xl font-bold">{n}</p>
                <p className="text-2xl font-extrabold text-amber-300">{p}% {pick(["afín", "match"])}</p>
                <p className="rounded-full bg-white px-4 py-1.5 text-xl font-bold text-teal-800">{pick(["Seguir", "Follow"])}</p>
              </motion.div>
            ))}
          </div>
          <motion.p {...pop(1.8)} className="rounded-full bg-white/15 px-8 py-3 text-3xl ring-1 ring-white/30">
            🔗 {pick(["Invita a tus amigos con tu enlace", "Invite your friends with your link"])}
          </motion.p>
        </div>
      );
    case 6:
      return (
        <div className={`${card} w-[780px] space-y-4`}>
          <motion.p {...pop(0.2)} className="max-w-[70%] rounded-3xl rounded-bl-md bg-white/20 px-6 py-3 text-3xl">
            {pick(["¿Has visto Dune? 🍿", "Have you seen Dune? 🍿"])}
          </motion.p>
          <motion.p {...pop(1)} className="ml-auto max-w-[70%] rounded-3xl rounded-br-md bg-teal-500 px-6 py-3 text-3xl">
            {pick(["¡Aún no! Pásamela", "Not yet! Send it my way"])}
          </motion.p>
          <motion.div {...pop(1.9)} className="flex w-[430px] gap-4 rounded-2xl bg-white p-4 text-neutral-900">
            <Poster i={2} className="h-32 w-22 shrink-0" />
            <div className="space-y-2">
              <p className="text-lg font-semibold uppercase text-neutral-500">{pick(["Recomendación", "Recommendation"])}</p>
              <p className="text-3xl font-bold">Dune</p>
              <motion.p initial={{ scale: 1 }} animate={{ scale: [1, 1.12, 1] }} transition={{ delay: 3.4, duration: 0.5 }} className="rounded-full bg-teal-700 px-5 py-1.5 text-xl font-semibold text-white">
                {pick(["Añadir a pendientes", "Add to watchlist"])}
              </motion.p>
            </div>
          </motion.div>
          <motion.p {...pop(4)} className="text-2xl text-teal-100">
            {pick(["Sin «visto»: nadie sabe si leíste su mensaje", "No read receipts: nobody knows if you read it"])}
          </motion.p>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center gap-7">
          <motion.div {...pop(0.2)} className={`${card} w-[760px] space-y-2`}>
            <p className="text-2xl font-bold text-emerald-300">● {pick(["¿Qué viene después?", "What's next?"])}</p>
            <p className="text-3xl">{pick(["Próximo capítulo: T5E1 el 12 de diciembre", "Next episode: S5E1 on December 12"])}</p>
          </motion.div>
          <motion.p {...pop(1)} className="text-3xl">
            🔔 {pick(["Avisos", "Alerts"])} · 💬 {pick(["Mensajes", "Messages"])} · 🚫 {pick(["Bloqueos", "Blocking"])} · ♿ {pick(["Accesibilidad", "Accessibility"])}
          </motion.p>
          <motion.p {...pop(1.8)} className="rounded-full bg-white px-10 py-4 text-4xl font-extrabold text-teal-800 shadow-xl">
            {pick(["¡Empieza a marcar lo que ves!", "Start tracking what you watch!"])}
          </motion.p>
        </div>
      );
  }
}

const CAPTIONS: L[] = [
  ["Bienvenido a Claqueta", "Welcome to Claqueta"],
  ["1 · Explora películas y series", "1 · Explore movies and series"],
  ["2 · Marca lo que ves y ponle nota", "2 · Track what you watch and rate it"],
  ["3 · Sigue cada serie capítulo a capítulo", "3 · Follow each series episode by episode"],
  ["4 · Crea listas, ordena y exporta", "4 · Create lists, sort and export"],
  ["5 · Descubre gente con tus gustos", "5 · Discover people with your taste"],
  ["6 · Chatea y recomienda", "6 · Chat and recommend"],
  ["7 · Y mucho más", "7 · And much more"],
];


const NARRATION: L[] = [
  ["Bienvenido a Claqueta: tu cine, tus opiniones y tus amigos, en un solo sitio.", "Welcome to Claqueta: your cinema, your opinions and your friends, all in one place."],
  ["Explora miles de películas y series. Busca cualquier título o descubre lo que está de moda.", "Explore thousands of movies and series. Search any title or see what's trending."],
  ["Marca lo que quieres ver, lo que estás viendo y lo que ya has visto, y ponle nota con estrellas, enteras o medias. Tus notas son privadas.", "Mark what you want to watch, what you're watching and what you've seen, and rate it with stars, whole or half. Your ratings are private."],
  ["En las series, sigue tu progreso temporada a temporada y capítulo a capítulo. Con un toque marcas todo lo anterior como visto.", "For series, follow your progress season by season and episode by episode. One tap marks everything before it as watched."],
  ["Crea listas con películas y series mezcladas, elige quién puede verlas, ordena Mi lista por nota o género, y expórtala a Excel.", "Create lists mixing movies and series, choose who can see them, sort My list by rating or genre, and export it to Excel."],
  ["En Descubrir encuentras gente con tus mismos gustos, con su porcentaje de afinidad. Y puedes invitar a tus amigos con tu enlace.", "In Discover you'll find people with your taste, with their match percentage. And you can invite your friends with your link."],
  ["Chatea con tus seguidores mutuos y recomiéndales títulos. Ellos pueden añadirlos a pendientes con un toque, y sin confirmaciones de lectura.", "Chat with your mutual followers and recommend titles. They can add them to their watchlist in one tap, and there are no read receipts."],
  ["Además verás cuándo llega el próximo capítulo, recibirás avisos y podrás ajustar la accesibilidad. ¡Empieza a marcar lo que ves!", "You'll also see when the next episode arrives, get alerts and adjust accessibility. Start tracking what you watch!"],
];

// Elige la mejor voz FEMENINA del dispositivo para el idioma. Cada sistema trae las suyas:
// se prefieren las «naturales/neuronales» (Edge, Chrome, Apple) y se descartan las masculinas conocidas.
const FEMALE = /(helena|laura|m[oó]nica|paulina|sabina|elvira|dalia|luc[ií]a|marisol|esperanza|ximena|camila|ana\b|elena|carmen|isabella|salome|samantha|zira|susan|hazel|libby|sonia|maisie|aria|jenny|karen|catherine|serena|moira|tessa|female|mujer|femenin|google espa|google uk english female|google us english)/i;
const MALE = /(pablo|jorge|diego|ra[uú]l|[aá]lvaro|miguel|juan|carlos|enrique|david|mark|guy|ryan|george|james|daniel|thomas|fred|alex\b|tom\b|andr[eé]s|antonio|male\b|hombre|masculin|alvaro|ronnie|liam|christopher|eric|roger|steffan|willem)/i;
const NATURAL = /(natural|neural|online|premium|enhanced|mejorada|siri|wavenet|studio)/i;

type Choice = { voice: SpeechSynthesisVoice | null; female: boolean };
function pickVoice(lang: "es" | "en"): Choice {
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang));
  if (all.length === 0) return { voice: null, female: false };
  const region = lang === "es" ? ["es-es", "es-mx", "es-us"] : ["en-gb", "en-us"];
  const score = (v: SpeechSynthesisVoice) => {
    const r = region.indexOf(v.lang.toLowerCase().replace("_", "-"));
    return (
      (FEMALE.test(v.name) ? 100 : 0) -
      (MALE.test(v.name) ? 200 : 0) +
      (NATURAL.test(v.name) ? 40 : 0) +
      (v.localService ? 0 : 5) +
      (r >= 0 ? 3 - r : 0)
    );
  };
  const best = [...all].sort((a, b) => score(b) - score(a))[0];
  return { voice: best, female: FEMALE.test(best.name) && !MALE.test(best.name) };
}

export function GuideVideoButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2.5 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
        {t("video.open")}
      </button>
      {open && <GuideVideo onClose={() => setOpen(false)} />}
    </>
  );
}

function GuideVideo({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [scale, setScale] = useState(0.6);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speechDone, setSpeechDone] = useState(false);
  const [voicesVer, setVoicesVer] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const last = CAPTIONS.length - 1;
  const pick = useCallback((l: L) => (lang === "en" ? l[1] : l[0]), [lang]);
  const supported = mounted && typeof window !== "undefined" && "speechSynthesis" in window;
  const useVoice = voiceOn && supported;
  const text = pick(NARRATION[index]);
  const minMs = MIN_MS[index];

  useEffect(() => setMounted(true), []);

  // Las voces del navegador se cargan de forma asíncrona: al llegar se vuelve a elegir
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const bump = () => setVoicesVer((v) => v + 1);
    synth.addEventListener("voiceschanged", bump);
    return () => synth.removeEventListener("voiceschanged", bump);
  }, []);

  const go = useCallback(
    (i: number) => {
      setIndex(Math.max(0, Math.min(last, i)));
      setElapsed(0);
      setSpeechDone(false);
      setEnded(false);
    },
    [last]
  );

  // Reloj de la escena actual
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(timer);
  }, [playing]);

  // Locución: se lee el texto de la escena con una voz femenina del dispositivo
  useEffect(() => {
    if (!supported || !voiceOn || !playing) return;
    const synth = window.speechSynthesis;
    let cancelled = false;
    setSpeechDone(false);
    const start = setTimeout(() => {
      const { voice, female } = pickVoice(lang === "en" ? "en" : "es");
      // Frases sueltas: la entonación suena más natural y se evitan los cortes de las frases largas
      const parts = text.split(/(?<=[.!?:])\s+/).filter(Boolean);
      synth.cancel();
      parts.forEach((part, k) => {
        const u = new SpeechSynthesisUtterance(part);
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? (lang === "en" ? "en-GB" : "es-ES");
        u.rate = 0.95;
        // Si el dispositivo solo tiene voces masculinas, se sube el tono para acercarla a una femenina
        u.pitch = female ? 1.05 : voice ? 1.45 : 1.2;
        if (k === parts.length - 1) {
          const done = () => {
            if (!cancelled) setTimeout(() => !cancelled && setSpeechDone(true), SPEECH_GAP_MS);
          };
          u.onend = done;
          u.onerror = done;
        }
        synth.speak(u);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(start);
      synth.cancel();
    };
  }, [index, playing, voiceOn, supported, text, lang, voicesVer]);

  // Pasa a la siguiente escena: con voz, al terminar de hablar (con un tope por si el navegador no avisa)
  useEffect(() => {
    if (!playing) return;
    const maxWait = minMs + text.length * 110 + 4000;
    const ready = useVoice ? (speechDone && elapsed >= minMs) || elapsed >= maxWait : elapsed >= minMs;
    if (!ready) return;
    if (index >= last) {
      setPlaying(false);
      setEnded(true);
    } else go(index + 1);
  }, [elapsed, speechDone, playing, useVoice, minMs, text, index, last, go]);

  // Tamaño: el escenario se diseña a 960×540 y se escala al ancho disponible
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 960));
    ro.observe(el);
    setScale(el.clientWidth / 960);
    return () => ro.disconnect();
  }, [mounted]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [onClose, go, index]);

  if (!mounted) return null;

  const est = useVoice ? Math.max(minMs, text.length * 68) : minMs;
  const pct = (i: number) =>
    i < index || (i === index && ended) ? 100 : i === index ? (speechDone ? 100 : Math.min(98, (elapsed / est) * 100)) : 0;

  const ctrl =
    "grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("video.title")}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3 backdrop-blur-md sm:p-8"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl space-y-3" onClick={(e) => e.stopPropagation()}>
        <div
          ref={frameRef}
          className="relative aspect-video w-full overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-neutral-950 text-white shadow-2xl"
        >
          <MotionConfig reducedMotion="user">
            <div className="absolute left-0 top-0 h-[540px] w-[960px] origin-top-left" style={{ transform: `scale(${scale})` }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center pb-20"
                >
                  <Scenes index={index} pick={pick} />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-10 pb-7 pt-12">
                <p className="text-4xl font-bold">{pick(CAPTIONS[index])}</p>
              </div>
            </div>
          </MotionConfig>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className={ctrl} onClick={() => go(index - 1)} aria-label={t("video.prev")} disabled={index === 0}>
            ‹
          </button>
          <button
            type="button"
            className={ctrl}
            aria-label={playing ? t("video.pause") : t("video.play")}
            onClick={() => {
              if (ended) {
                go(0);
                setPlaying(true);
              } else setPlaying((p) => !p);
            }}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button type="button" className={ctrl} onClick={() => go(index + 1)} aria-label={t("video.next")} disabled={index === last}>
            ›
          </button>

          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {CAPTIONS.map((_, i) => (
              <button key={i} type="button" tabIndex={-1} onClick={() => go(i)} className="h-2 flex-1 overflow-hidden rounded-full bg-white/25">
                <span className="block h-full bg-white transition-[width] duration-100" style={{ width: `${pct(i)}%` }} />
              </button>
            ))}
          </div>

          {supported && (
            <button
              type="button"
              className={ctrl}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? t("video.voiceOn") : t("video.voiceOff")}
              title={voiceOn ? t("video.voiceOn") : t("video.voiceOff")}
              onClick={() => setVoiceOn((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
                {voiceOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6m0-6-5 6" />}
              </svg>
            </button>
          )}

          <button ref={closeRef} type="button" className={ctrl} onClick={onClose} aria-label={t("a11y.close")}>
            ×
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
