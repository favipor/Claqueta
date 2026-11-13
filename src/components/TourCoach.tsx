"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";

// Recorrido por la web tras la visita guiada: una tarjeta flotante que te lleva página a página.
// El paso actual se guarda en el navegador; «Saltar» lo termina en cualquier momento.
const KEY = "claq_tour";
type Step = { path: (u: string | null) => string; target?: string; icon: string; title: [string, string]; text: [string, string] };

const STEPS: Step[] = [
  {
    path: () => "/mi-lista",
    icon: "📚",
    title: ["Tu lista", "Your list"],
    text: [
      "Aquí está todo lo que marcas, incluidos los títulos de hace un momento. Filtra por estado, ordena por nota o busca.",
      "Everything you mark lives here, including the titles you just picked. Filter by status, sort by rating or search.",
    ],
  },
  {
    path: () => "/",
    target: "[data-tour=parati]",
    icon: "✨",
    title: ["Para ti", "For you"],
    text: [
      "Recomendaciones según lo que te gusta. Cámbialas por un título, por un género, o pulsa Sorpresa.",
      "Recommendations based on your taste. Base them on a title or a genre, or tap Surprise me.",
    ],
  },
  {
    path: () => "/actividad",
    icon: "👥",
    title: ["Amigos", "Friends"],
    text: [
      "Mira lo que ven tus amigos y reacciona. En «Juntos» elegís qué ver entre dos y en «Descubrir gente» encuentras personas con tus gustos.",
      "See what your friends watch and react. In “Together” you pick something to watch as a pair, and “Find people” shows people with your taste.",
    ],
  },
  {
    path: () => "/calendario",
    icon: "📅",
    title: ["Calendario", "Calendar"],
    text: ["Los estrenos de tus series y lo que llega a los cines de España, día a día.", "Upcoming episodes of your shows and what's hitting cinemas, day by day."],
  },
  {
    path: (u) => (u ? `/u/${u}` : "/"),
    target: "#ach-title",
    icon: "🏆",
    title: ["Tu perfil", "Your profile"],
    text: ["Tus estadísticas, tu racha y tus logros. ¡A por el oro!", "Your stats, streak and achievements. Go for gold!"],
  },
];

type State = { step: number; user: string | null };
const read = (): State | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};
const write = (s: State | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event("claq:tour"));
};

export function startTour(username: string | null) {
  write({ step: 0, user: username });
}

export function TourCoach() {
  const { lang } = useI18n();
  const L = lang === "en" ? 1 : 0;
  const router = useRouter();
  const pathname = usePathname();
  const [st, setSt] = useState<State | null>(null);

  useEffect(() => {
    const sync = () => setSt(read());
    sync();
    window.addEventListener("claq:tour", sync);
    return () => window.removeEventListener("claq:tour", sync);
  }, []);

  const step = st ? STEPS[st.step] : null;
  const here = !!step && pathname === step.path(st!.user);

  // Resalta y centra el elemento del paso (p. ej. «Para ti»)
  useEffect(() => {
    if (!here || !step?.target) return;
    let el: Element | null = null;
    const t = setTimeout(() => {
      el = document.querySelector(step.target!);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("tour-spot");
    }, 600);
    return () => {
      clearTimeout(t);
      el?.classList.remove("tour-spot");
    };
  }, [here, step]);

  if (!st || !step) return null;
  const last = st.step === STEPS.length - 1;
  const go = (n: number) => {
    if (n >= STEPS.length) {
      write(null);
      return;
    }
    write({ ...st, step: n });
    router.push(STEPS[n].path(st.user));
  };

  return (
    <div className="tour-card fixed inset-x-3 bottom-3 z-[97] mx-auto max-w-md rounded-3xl bg-neutral-950 p-5 text-white shadow-2xl ring-1 ring-white/15 sm:bottom-6" role="dialog" aria-label={step.title[L]}>
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 text-2xl" aria-hidden="true">
          {step.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
            {L ? "Tour" : "Recorrido"} · {st.step + 1}/{STEPS.length}
          </p>
          <p className="text-lg font-extrabold leading-tight">{step.title[L]}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{step.text[L]}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === st.step ? "w-6 bg-teal-300" : k < st.step ? "w-1.5 bg-teal-300/60" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => write(null)} className="rounded-full px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">
            {L ? "Skip tour" : "Saltar recorrido"}
          </button>
          {here ? (
            <button type="button" onClick={() => go(st.step + 1)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-teal-100">
              {last ? (L ? "Finish 🎉" : "Terminar 🎉") : L ? "Next →" : "Siguiente →"}
            </button>
          ) : (
            <button type="button" onClick={() => router.push(step.path(st.user))} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-teal-100">
              {L ? "Continue tour →" : "Seguir recorrido →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
