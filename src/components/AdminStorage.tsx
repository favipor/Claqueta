"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "./I18nProvider";

export type DbUsage = {
  db_bytes: number;
  storage_bytes: number;
  storage_files: number;
  tables: { name: string; bytes: number }[];
};

// Límites del plan gratuito de Supabase. Si algún día pasas al plan Pro, cámbialos aquí (8 GB y 100 GB).
const DB_LIMIT = 500 * 1024 * 1024;
const STORAGE_LIMIT = 1024 * 1024 * 1024;

const TABLE_NAMES: Record<string, { es: string; en: string }> = {
  user_titles: { es: "Títulos marcados", en: "Tracked titles" },
  user_episodes: { es: "Capítulos vistos", en: "Watched episodes" },
  user_seasons: { es: "Temporadas", en: "Seasons" },
  comments: { es: "Comentarios", en: "Comments" },
  messages: { es: "Mensajes", en: "Messages" },
  notifications: { es: "Notificaciones", en: "Notifications" },
  profiles: { es: "Perfiles", en: "Profiles" },
  follows: { es: "Seguidores", en: "Follows" },
  list_items: { es: "Títulos en listas", en: "List items" },
  lists: { es: "Listas", en: "Lists" },
  profile_visits: { es: "Visitas a perfiles", en: "Profile visits" },
};

const SEG_COLORS = ["bg-teal-600", "bg-teal-400", "bg-cyan-500", "bg-sky-500", "bg-indigo-400", "bg-violet-400"];

function fmt(bytes: number, lang: string) {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(lang, { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 })} ${units[i]}`;
}

// Color del porcentaje: verde azulado hasta el 60 %, ámbar hasta el 85 % y rojo a partir de ahí
function tone(pct: number) {
  if (pct >= 85) return "text-red-500";
  if (pct >= 60) return "text-amber-500";
  return "text-brand-fg";
}

type Segment = { key: string; label: string; bytes: number; color: string };

function UsageBar({
  title,
  icon,
  used,
  limit,
  segments,
  extra,
}: {
  title: string;
  icon: React.ReactNode;
  used: number;
  limit: number;
  segments: Segment[];
  extra?: string;
}) {
  const { t, lang } = useI18n();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Segment | null>(null);
  const pct = Math.min(100, (used / limit) * 100);
  const pctLabel = pct < 1 && used > 0 ? "<1" : Math.round(pct).toString();

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand-fg">{icon}</span>
          <div>
            <p className="font-bold">{title}</p>
            <p className="text-xs text-neutral-500">
              {fmt(used, lang)} {t("admin.of")} {fmt(limit, lang)}
              {extra ? ` · ${extra}` : ""}
            </p>
          </div>
        </div>
        <p className={`text-3xl font-extrabold tabular-nums ${tone(pct)}`}>{pctLabel}%</p>
      </div>

      {/* Barra: cada tramo es una parte de lo ocupado; al pasar el ratón se ve qué es y cuánto ocupa */}
      <div className="relative">
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={`${fmt(used, lang)} ${t("admin.of")} ${fmt(limit, lang)}`}
          className="h-4 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        >
          <motion.div
            className="flex h-full"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${Math.max(pct, used > 0 ? 1.5 : 0)}%` }}
            transition={{ duration: reduce ? 0 : 1, ease: "easeOut" }}
          >
            {segments.map((s) => (
              <div
                key={s.key}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(null)}
                className={`h-full ${s.color} transition-opacity ${hover && hover.key !== s.key ? "opacity-50" : ""}`}
                style={{ width: `${used > 0 ? (s.bytes / used) * 100 : 0}%` }}
              />
            ))}
          </motion.div>
        </div>
        {hover && (
          <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900">
            {hover.label}: {fmt(hover.bytes, lang)} ({((hover.bytes / limit) * 100).toLocaleString(lang, { maximumFractionDigits: 1 })}%)
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        {fmt(Math.max(0, limit - used), lang)} {t("admin.free")}
      </p>

      {segments.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {segments.map((s) => (
            <li
              key={s.key}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              className="flex cursor-default items-center gap-1.5 text-neutral-600 dark:text-neutral-300"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
              {s.label} <span className="text-neutral-400">{fmt(s.bytes, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminStorage({ usage }: { usage: DbUsage }) {
  const { t, lang } = useI18n();
  const db = Number(usage.db_bytes) || 0;
  const files = Number(usage.storage_bytes) || 0;

  const tables = (usage.tables ?? []).map((tb, i) => ({
    key: tb.name,
    label: TABLE_NAMES[tb.name]?.[lang === "en" ? "en" : "es"] ?? tb.name,
    bytes: Number(tb.bytes) || 0,
    color: SEG_COLORS[i % SEG_COLORS.length],
  }));
  const rest = Math.max(0, db - tables.reduce((n, s) => n + s.bytes, 0));
  const dbSegments: Segment[] = [
    ...tables,
    { key: "_rest", label: lang === "en" ? "System and others" : "Sistema y otros", bytes: rest, color: "bg-neutral-400" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">{t("admin.storage")}</h2>
        <p className="text-xs text-neutral-500">{t("admin.planNote")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <UsageBar
          title={t("admin.db")}
          used={db}
          limit={DB_LIMIT}
          segments={dbSegments}
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            </svg>
          }
        />
        <UsageBar
          title={t("admin.files")}
          used={files}
          limit={STORAGE_LIMIT}
          extra={`${Number(usage.storage_files) || 0} ${lang === "en" ? "files" : "archivos"}`}
          segments={[{ key: "files", label: t("admin.files"), bytes: files, color: "bg-teal-500" }]}
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="m21 16-5-5-9 9" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
