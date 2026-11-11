"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";

// Actividad por mes (una sola serie: títulos vistos + capítulos). Barras finas de un solo color,
// puntas redondeadas apoyadas en la base, aviso al pasar el ratón o tocar, y lista para lectores de pantalla.
export function YearMonths({ months }: { months: { m: number; n: number }[] }) {
  const { lang, t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const byMonth = new Map(months.map((x) => [x.m, x.n]));
  const max = Math.max(1, ...months.map((x) => x.n));
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", { month: "short" });
  const fmtLong = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", { month: "long" });
  const name = (m: number) => fmt.format(new Date(Date.UTC(2024, m - 1, 15))).replace(".", "");
  const longName = (m: number) => fmtLong.format(new Date(Date.UTC(2024, m - 1, 15)));

  return (
    <div>
      <div className="relative flex h-40 items-end gap-[2px] border-b border-white/25" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const n = byMonth.get(m) ?? 0;
          const h = n === 0 ? 0 : Math.max(4, (n / max) * 100);
          return (
            <div
              key={m}
              className="relative flex h-full flex-1 cursor-default items-end justify-center"
              onMouseEnter={() => setHover(m)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover((c) => (c === m ? null : m))}
            >
              <div
                className={`w-full max-w-7 rounded-t-[4px] transition-colors ${hover === m ? "bg-white" : "bg-teal-300/85"}`}
                style={{ height: `${h}%` }}
              />
              {hover === m && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-lg">
                  <span className="capitalize">{longName(m)}</span>: {n} {t("year.activityUnit")}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] font-medium uppercase text-white/70" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="flex-1 text-center">
            {name(i + 1).slice(0, 3)}
          </span>
        ))}
      </div>
      <ul className="sr-only">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            {longName(i + 1)}: {byMonth.get(i + 1) ?? 0} {t("year.activityUnit")}
          </li>
        ))}
      </ul>
    </div>
  );
}
