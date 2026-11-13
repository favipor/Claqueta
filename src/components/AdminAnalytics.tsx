"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearErrors } from "@/app/admin-actions";
import { useI18n } from "./I18nProvider";

export type Analytics = {
  days: { d: string; views: number; users: number }[];
  top: { path: string; views: number }[];
  views: number;
  active_users: number;
};

export type ErrorRow = { id: string; created_at: string; message: string; stack: string | null; path: string | null; user_agent: string | null };

// Barras de una sola serie (un solo color), puntas redondeadas, aviso al pasar el ratón y tabla para lectores de pantalla
function DayBars({ title, data, unit }: { title: string; data: { d: string; n: number }[]; unit: string }) {
  const { lang } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((x) => x.n));
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short" });
  const total = data.reduce((a, b) => a + b.n, 0);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <p className="text-2xl font-extrabold tabular-nums">{total}</p>
      </div>
      <div className="relative flex h-32 items-end gap-[2px] border-b border-neutral-200 dark:border-neutral-700" aria-hidden="true">
        {data.map((x, i) => (
          <div
            key={x.d}
            className="relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover((h) => (h === i ? null : i))}
          >
            <div
              className={`w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-brand-fg" : "bg-teal-500/80"}`}
              style={{ height: x.n === 0 ? 0 : `${Math.max(4, (x.n / max) * 100)}%` }}
            />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900">
                {fmt(x.d)}: {x.n} {unit}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-500" aria-hidden="true">
        <span>{data[0] ? fmt(data[0].d) : ""}</span>
        <span>{data.at(-1) ? fmt(data.at(-1)!.d) : ""}</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((x) => (
            <tr key={x.d}>
              <td>{fmt(x.d)}</td>
              <td>{x.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAnalytics({ data, errors }: { data: Analytics | null; errors: ErrorRow[] | null }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      {data && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{t("admin.usage")}</h2>
            <p className="text-xs text-neutral-500">{t("admin.usageNote")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DayBars title={t("admin.views")} unit={t("admin.viewsUnit")} data={data.days.map((d) => ({ d: d.d, n: Number(d.views) }))} />
            <DayBars title={t("admin.activeUsers")} unit={t("admin.usersUnit")} data={data.days.map((d) => ({ d: d.d, n: Number(d.users) }))} />
          </div>
          {data.top.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-3 font-bold">{t("admin.topPages")}</h3>
              <ol className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
                {data.top.map((p) => {
                  const max = Number(data.top[0].views) || 1;
                  return (
                    <li key={p.path} className="text-sm">
                      <div className="mb-1 flex justify-between gap-3">
                        <code className="truncate">{p.path}</code>
                        <span className="tabular-nums text-neutral-500">{p.views}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-teal-500/80" style={{ width: `${(Number(p.views) / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      )}

      {errors && (
        <section id="errores" className="scroll-mt-24 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">
              {t("admin.errors")} <span className="text-base font-semibold text-neutral-500">({errors.length})</span>
            </h2>
            {errors.length > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => { await clearErrors(); router.refresh(); })}
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t("admin.clearErrors")}
              </button>
            )}
          </div>
          {errors.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
              ✅ {t("admin.noErrors")}
            </p>
          ) : (
            <ul className="max-h-[65dvh] overflow-y-auto overscroll-contain pr-1 space-y-2">
              {errors.map((e) => (
                <li key={e.id} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="w-full text-left">
                    <p className="font-semibold text-red-600 [overflow-wrap:anywhere] dark:text-red-400">{e.message}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 [overflow-wrap:anywhere]">
                      {new Date(e.created_at).toLocaleString(lang === "en" ? "en-GB" : "es-ES")} · {e.path ?? "?"}
                    </p>
                  </button>
                  {open === e.id && (
                    <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg [overflow-wrap:anywhere] bg-neutral-100 p-3 text-[11px] dark:bg-neutral-800">
                      {e.stack ?? ""}
                      {e.user_agent ? `\n\n${e.user_agent}` : ""}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
