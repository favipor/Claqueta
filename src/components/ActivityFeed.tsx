"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Reactions, type ReactionSummary } from "./Reactions";
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
  const [me, setMe] = useState<string | null>(null);
  const [reacts, setReacts] = useState<Record<string, ReactionSummary>>({});
  const keyOf = (r: { user_id: string; tmdb_id: number; media_type: string }) => `${r.user_id}-${r.media_type}-${r.tmdb_id}`;

  // Reacciones de las entradas que se ven (se cargan cada vez que llegan más)
  useEffect(() => {
    if (!rows.length) return;
    const supabase = createClient();
    (async () => {
      const [{ data: auth }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("activity_reactions")
          .select("reactor_id, owner_id, tmdb_id, media_type, emoji")
          .in("owner_id", [...new Set(rows.map((r) => r.user_id))])
          .in("tmdb_id", [...new Set(rows.map((r) => r.tmdb_id))])
          .limit(2000),
      ]);
      const uid = auth.user?.id ?? null;
      setMe(uid);
      const out: Record<string, ReactionSummary> = {};
      for (const x of data ?? []) {
        const k = `${x.owner_id}-${x.media_type}-${x.tmdb_id}`;
        const cur = (out[k] ??= { counts: {}, mine: null });
        cur.counts[x.emoji] = (cur.counts[x.emoji] ?? 0) + 1;
        if (x.reactor_id === uid) cur.mine = x.emoji;
      }
      setReacts(out);
    })();
  }, [rows]);

  // Más entradas al llegar al final del recuadro (con su propio scroll)
  const boxRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (done || pending) return;
    start(async () => {
      const more = await loadActivity(rows.at(-1)?.at ?? null);
      setRows((r) => [...r, ...more]);
      if (more.length < 30) setDone(true);
    });
  }, [done, pending, rows]);
  useEffect(() => {
    const end = endRef.current;
    if (!end || done) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { root: boxRef.current, rootMargin: "200px" });
    io.observe(end);
    return () => io.disconnect();
  }, [loadMore, done]);

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
              <svg viewBox="0 0 24 24" className="mr-1.5 inline h-4 w-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="8" r="4" />
                <path d="M2 21c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5M19 8v6M16 11h6" />
              </svg>
              {t("invite.menu")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="max-h-[calc(100dvh-13rem)] min-h-[16rem] overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950/40 sm:p-3"
    >
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
                <Reactions
                  ownerId={r.user_id}
                  tmdbId={r.tmdb_id}
                  mediaType={r.media_type}
                  meId={me}
                  value={reacts[keyOf(r)] ?? { counts: {}, mine: null }}
                  onChange={(v) => setReacts((m) => ({ ...m, [keyOf(r)]: v }))}
                />
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
      <div ref={endRef} className="flex justify-center py-3" aria-live="polite">
        {pending && <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-brand" aria-label={t("catalog.loading")} />}
        {done && rows.length > 8 && <span className="text-xs text-neutral-400">· · ·</span>}
      </div>
    </div>
  );
}
