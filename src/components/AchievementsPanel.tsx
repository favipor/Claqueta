"use client";

import { useState } from "react";
import { ACHIEVEMENTS, TIER_NAMES, TOTAL_TIERS, tierOf, type AchStats } from "@/lib/achievements";
import { useI18n } from "./I18nProvider";

// Colores de cada nivel: bloqueado, bronce, plata, oro
const MEDAL = [
  "from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700",
  "from-amber-600 via-orange-400 to-amber-700",
  "from-slate-300 via-white to-slate-400",
  "from-yellow-300 via-amber-200 to-yellow-500",
];
const RING = ["ring-neutral-300 dark:ring-neutral-700", "ring-orange-300/70", "ring-slate-200", "ring-yellow-200"];
const GLOW = ["", "shadow-[0_8px_24px_-6px_rgba(234,88,12,.55)]", "shadow-[0_8px_24px_-6px_rgba(148,163,184,.7)]", "shadow-[0_8px_28px_-4px_rgba(250,204,21,.75)]"];

export function AchievementsPanel({ stats, own }: { stats: AchStats; own: boolean }) {
  const { lang } = useI18n();
  const L = lang === "en" ? 1 : 0;
  const [all, setAll] = useState(false);

  const rows = ACHIEVEMENTS.map((a) => ({ a, tier: tierOf(a, stats), value: stats[a.stat] ?? 0 }))
    // primero lo conseguido (oro → bronce) y luego lo que está más cerca
    .sort((x, y) => y.tier - x.tier || y.value / (y.a.tiers[Math.min(y.tier, 2)] || 1) - x.value / (x.a.tiers[Math.min(x.tier, 2)] || 1));
  const got = rows.reduce((n, r) => n + r.tier, 0);
  const shown = all ? rows : rows.slice(0, 10);
  const streak = stats.streak ?? 0;

  return (
    <section className="space-y-4" aria-labelledby="ach-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="ach-title" className="text-lg font-bold">
          🏆 {L ? "Achievements" : "Logros"}
        </h2>
        <span className="text-sm font-semibold text-neutral-500">
          {got}/{TOTAL_TIERS} {L ? "unlocked" : "conseguidos"}
        </span>
      </div>

      {/* Racha */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-10 text-[9rem] leading-none opacity-20" aria-hidden="true">
          🔥
        </div>
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3">
            <span className={`text-5xl ${streak > 0 ? "animate-[pulse_2s_ease-in-out_infinite]" : "grayscale"}`} aria-hidden="true">
              🔥
            </span>
            <div>
              <p className="text-4xl font-black leading-none tabular-nums">{streak}</p>
              <p className="text-sm font-semibold text-white/85">{L ? (streak === 1 ? "day streak" : "day streak") : streak === 1 ? "día de racha" : "días de racha"}</p>
            </div>
          </div>
          <div className="text-sm text-white/90">
            <p>
              {L ? "Best streak" : "Mejor racha"}: <b className="text-white">{stats.best_streak ?? 0}</b> {L ? "days" : "días"}
            </p>
            <p className="text-white/75">
              {own
                ? streak > 0
                  ? L
                    ? "Track something today to keep it going!"
                    : "¡Marca algo hoy para no perderla!"
                  : L
                    ? "Track something today to start a streak."
                    : "Marca algo hoy para empezar una racha."
                : L
                  ? "Days in a row tracking movies or episodes."
                  : "Días seguidos marcando pelis o capítulos."}
            </p>
          </div>
        </div>
      </div>

      {/* Medallas */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map(({ a, tier, value }) => {
          const next = a.tiers[Math.min(tier, 2)];
          const pct = tier === 3 ? 100 : Math.min(100, Math.round((value / next) * 100));
          return (
            <li
              key={a.id}
              className="group relative flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-4 text-center transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div
                className={`relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br ring-4 transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105 ${MEDAL[tier]} ${RING[tier]} ${GLOW[tier]}`}
              >
                <span className={`text-4xl drop-shadow ${tier ? "" : "opacity-40 grayscale"}`} aria-hidden="true">
                  {a.emoji}
                </span>
                {tier > 0 && (
                  // destello que cruza la medalla al pasar el ratón
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
                )}
                {tier === 0 && (
                  <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-neutral-900/80 text-[11px]" aria-hidden="true">
                    🔒
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-extrabold leading-tight">{a.name[L]}</p>
              <p
                className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  tier === 3
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                    : tier === 2
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      : tier === 1
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                }`}
              >
                {tier ? TIER_NAMES[tier - 1][L] : L ? "Locked" : "Bloqueado"}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true">
                <div className={`h-full rounded-full ${tier === 3 ? "bg-yellow-400" : "bg-brand"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] leading-tight text-neutral-500">
                {tier === 3 ? (L ? "Maxed out! " : "¡Al máximo! ") : ""}
                <span className="tabular-nums">
                  {/* «Maratoniano» al máximo: «20+» (las importaciones meten miles de capítulos el mismo día) */}
                  {tier === 3 && a.id === "maraton" ? `${a.tiers[2]}+` : Math.min(value, tier === 3 ? value : next).toLocaleString(lang)}
                  {tier < 3 && `/${next.toLocaleString(lang)}`}
                </span>{" "}
                {a.unit[L]}
              </p>
            </li>
          );
        })}
      </ul>
      {rows.length > 10 && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {all ? (L ? "Show less" : "Ver menos") : L ? `See all ${rows.length}` : `Ver los ${rows.length}`}
          </button>
        </div>
      )}
    </section>
  );
}
