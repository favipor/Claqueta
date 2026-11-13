"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { PREF_COOKIES, savePref } from "@/lib/prefs";

export type CalMode = "estrenos" | "visto" | "ambos";
export type CalEvent = {
  kind: "release" | "seen" | "plan";
  date: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  label: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

// Tipo de evento: siempre con icono + texto (no solo color)
function KindBadge({ kind }: { kind: CalEvent["kind"] }) {
  const { t, lang } = useI18n();
  if (kind === "plan")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
        💞 {lang === "en" ? "Plan" : "Plan"}
      </span>
    );
  return kind === "release" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      📅 {t("cal.release")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
      ✓ {t("cal.seen")}
    </span>
  );
}

export function CalendarView({
  year,
  month,
  mode,
  cinema,
  events,
  onlyMine = false,
  hasProviders = false,
}: {
  year: number;
  month: number;
  mode: CalMode;
  cinema: boolean;
  events: CalEvent[];
  onlyMine?: boolean;
  hasProviders?: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, start] = useTransition();
  const locale = lang === "en" ? "en-GB" : "es-ES";
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const monthKey = `${year}-${pad(month)}`;

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const firstWithEvents = events[0]?.date ?? null;
  const [selected, setSelected] = useState<string | null>(
    todayKey.startsWith(monthKey) ? todayKey : firstWithEvents ?? `${monthKey}-01`
  );

  function go(next: { mes?: string; ver?: CalMode; cine?: boolean; prov?: boolean }) {
    const q = new URLSearchParams();
    const mes = next.mes ?? monthKey;
    const ver = next.ver ?? mode;
    const cine = next.cine ?? cinema;
    const prov = next.prov ?? onlyMine;
    if (mes !== `${today.getFullYear()}-${pad(today.getMonth() + 1)}`) q.set("mes", mes);
    if (ver !== "ambos") q.set("ver", ver);
    if (cine && ver !== "visto") q.set("cine", "1");
    if (prov && ver !== "visto") q.set("prov", "1");
    // Memoria: el filtro y el interruptor de cine (no el mes, que siempre empieza en el actual)
    const mem = new URLSearchParams();
    mem.set("ver", ver);
    mem.set("cine", cine ? "1" : "0");
    mem.set("prov", prov ? "1" : "0");
    savePref(PREF_COOKIES.calendar, mem.toString());
    const s = q.toString();
    start(() => router.push(`/calendario${s ? `?${s}` : ""}`, { scroll: false }));
  }

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  };

  // Rejilla de lunes a domingo
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }).replace(".", "")
  );
  const monthName = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });

  const modes: { key: CalMode; label: string; icon: string }[] = [
    { key: "estrenos", label: t("cal.modeReleases"), icon: "📅" },
    { key: "visto", label: t("cal.modeSeen"), icon: "✓" },
    { key: "ambos", label: t("cal.modeBoth"), icon: "◐" },
  ];

  const dayEvents = selected ? byDay.get(selected) ?? [] : [];
  const releasesCount = events.filter((e) => e.kind === "release").length;
  const seenCount = events.filter((e) => e.kind === "seen").length;

  return (
    <div className={`space-y-5 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("cal.title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mode !== "visto" && `${releasesCount} ${t("cal.releasesCount")}`}
            {mode === "ambos" && " · "}
            {mode !== "estrenos" && `${seenCount} ${t("cal.seenCount")}`}
          </p>
        </div>
        {/* Qué ver: selector segmentado */}
        <div role="radiogroup" aria-label={t("cal.title")} className="grid grid-cols-3 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800 sm:flex">
          {modes.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => go({ ver: m.key })}
                className={`relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "text-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="cal-mode"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-brand shadow"
                  />
                )}
                <span className="relative" aria-hidden="true">{m.icon}</span>
                <span className="relative">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mes y navegación */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => go({ mes: shift(-1) })} aria-label={t("cal.prev")} className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
              ‹
            </button>
            <h2 className="min-w-[10rem] text-center text-lg font-bold capitalize">{monthName}</h2>
            <button type="button" onClick={() => go({ mes: shift(1) })} aria-label={t("cal.next")} className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
              ›
            </button>
            {!todayKey.startsWith(monthKey) && (
              <button type="button" onClick={() => go({ mes: todayKey.slice(0, 7) })} className="ml-1 rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                {t("cal.today")}
              </button>
            )}
          </div>
          {mode !== "visto" && hasProviders && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold">
              <span className="text-neutral-600 dark:text-neutral-300">{t("prov.onlyMine")}</span>
              <input type="checkbox" role="switch" checked={onlyMine} onChange={(e) => go({ prov: e.target.checked })} className="peer sr-only" />
              <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand-fg dark:bg-neutral-700 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          )}
          {mode !== "visto" && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold">
              <span className="text-neutral-600 dark:text-neutral-300">{t("cal.cinema")}</span>
              <input type="checkbox" role="switch" checked={cinema} onChange={(e) => go({ cine: e.target.checked })} className="peer sr-only" />
              <span
                aria-hidden="true"
                className="relative h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand-fg dark:bg-neutral-700 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
              />
            </label>
          )}
        </div>

        {/* Rejilla */}
        <div className="grid grid-cols-7 border-b border-neutral-200 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
          {weekdays.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="min-h-14 border-b border-r border-neutral-100 bg-neutral-50/60 dark:border-neutral-800/60 dark:bg-neutral-950/30 sm:min-h-24" />;
            const list = byDay.get(d) ?? [];
            const isToday = d === todayKey;
            const isSel = d === selected;
            const rel = list.filter((e) => e.kind === "release").length;
            const seen = list.filter((e) => e.kind === "seen").length;
            const plan = list.some((e) => e.kind === "plan");
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
                aria-pressed={isSel}
                aria-label={`${new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long" })}: ${list.length}`}
                className={`relative flex min-h-14 flex-col items-stretch gap-1 border-b border-r border-neutral-100 p-1 text-left transition-colors dark:border-neutral-800/60 sm:min-h-24 sm:p-1.5 ${
                  isSel ? "bg-brand/10 ring-2 ring-inset ring-brand" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center self-start rounded-full text-xs font-bold ${
                    isToday ? "bg-brand text-white" : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {/* Móvil: puntos con número; ordenador: mini carátulas */}
                {list.length > 0 && (
                  <>
                    <span className="flex flex-wrap gap-1 sm:hidden" aria-hidden="true">
                      {rel > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                      {seen > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {plan && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    </span>
                    <span className="hidden gap-1 sm:flex" aria-hidden="true">
                      {list.slice(0, 3).map((e, j) => (
                        <span
                          key={j}
                          className={`relative aspect-[2/3] w-7 overflow-hidden rounded bg-neutral-200 ring-2 dark:bg-neutral-800 ${
                            e.kind === "plan" ? "ring-rose-500" : e.kind === "release" ? "ring-amber-400" : "ring-emerald-500"
                          }`}
                        >
                          {e.poster_path && <Image src={img(e.poster_path, "w92")!} alt="" fill sizes="28px" className="object-cover" />}
                        </span>
                      ))}
                      {list.length > 3 && <span className="self-end text-[10px] font-bold text-neutral-500">+{list.length - 3}</span>}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 px-4 py-2.5 text-xs text-neutral-500">
          {mode !== "visto" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 📅 {t("cal.release")}
            </span>
          )}
          {mode !== "estrenos" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ✓ {t("cal.seen")}
            </span>
          )}
        </div>
      </div>

      {/* Lo del día elegido */}
      {selected && (
        <section aria-live="polite">
          <h2 className="mb-3 text-lg font-bold capitalize">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
          </h2>
          {dayEvents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">{t("cal.empty")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {dayEvents.map((e, i) => (
                <li key={i}>
                  <Link
                    href={`/titulo/${e.media_type}/${e.tmdb_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                      {e.poster_path && <Image src={img(e.poster_path, "w92")!} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-semibold">{e.title}</span>
                      {e.label && <span className="line-clamp-1 text-xs text-neutral-500">{e.label}</span>}
                    </span>
                    <KindBadge kind={e.kind} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
