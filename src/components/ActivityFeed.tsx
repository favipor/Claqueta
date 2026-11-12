"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loadActivity, type ActivityRow } from "@/app/profile-actions";
import { img } from "@/lib/tmdb";
import type { DictKey } from "@/lib/dict";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

function ago(iso: string, lang: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short" });
}

export function ActivityFeed({ initial, myUsername }: { initial: ActivityRow[]; myUsername: string | null }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState(initial);
  const [done, setDone] = useState(initial.length < 30);
  const [pending, start] = useTransition();

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-4xl" aria-hidden="true">
          🍿
        </p>
        <p className="mt-2 font-semibold">{t("act.empty")}</p>
        <p className="mt-1 text-sm text-neutral-500">{t("act.emptyHint")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/descubrir" className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
            {t("act.findPeople")}
          </Link>
          {myUsername && (
            <Link
              href={`/invitar/${myUsername}`}
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              💌 {t("invite.menu")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((r) => {
          const name = r.display_name ?? `@${r.username}`;
          const verb = r.status ? t(`act.verb.${r.status}` as DictKey) : t("act.verb.rated");
          const poster = img(r.poster_path, "w92");
          return (
            <li
              key={`${r.user_id}-${r.media_type}-${r.tmdb_id}`}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Link href={`/u/${r.username}`} aria-label={name} className="shrink-0">
                <Avatar url={r.avatar_url} size={40} />
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <p className="leading-snug">
                  <Link href={`/u/${r.username}`} className="font-semibold hover:underline">
                    {name}
                  </Link>{" "}
                  <span className="text-neutral-500">{verb}</span>{" "}
                  <Link href={`/titulo/${r.media_type}/${r.tmdb_id}`} className="font-semibold text-brand-fg hover:underline">
                    {r.title}
                  </Link>
                  {r.rating !== null && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/80 px-1.5 py-0.5 align-middle text-[11px] font-bold text-white">
                      <span className="text-amber-400">★</span>
                      {Number(r.rating)}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">{ago(r.at, lang)}</p>
              </div>
              <Link
                href={`/titulo/${r.media_type}/${r.tmdb_id}`}
                className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800"
                aria-hidden="true"
                tabIndex={-1}
              >
                {poster && <Image src={poster} alt="" fill sizes="44px" className="object-cover" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {!done && (
        <div className="text-center">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const more = await loadActivity(rows.at(-1)?.at ?? null);
                setRows((r) => [...r, ...more]);
                if (more.length < 30) setDone(true);
              })
            }
            className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {pending ? t("catalog.loading") : t("catalog.more")}
          </button>
        </div>
      )}
    </div>
  );
}
