"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead, clearReadNotifications } from "@/app/social-actions";
import { respondFollowRequest } from "@/app/profile-actions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

export type NotifItem = {
  id: string;
  type: "follow_request" | "follow" | "follow_accepted" | "reply" | "mention" | "recommendation" | "message";
  unread: boolean;
  createdAt: string;
  actor: { id: string; username: string | null; name: string; avatarUrl: string | null } | null;
  titleName: string | null;
  href: string | null;
  titleHref: string | null;
  requestOpen: boolean;
};

function ago(iso: string, lang: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function NotificationsList({ items }: { items: NotifItem[] }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [answered, setAnswered] = useState<Record<string, "accepted" | "rejected">>({});
  const [busy, start] = useTransition();

  // Las nuevas se marcan como leídas poco después de abrir la página
  useEffect(() => {
    const autoRead = (n: NotifItem) => !["follow_request", "message", "recommendation"].includes(n.type);
    if (!items.some((n) => n.unread && autoRead(n))) return;
    const timer = setTimeout(() => {
      markNotificationsRead().then(() => router.refresh());
    }, 1800);
    return () => clearTimeout(timer);
  }, [items, router]);

  function answer(n: NotifItem, accept: boolean) {
    if (!n.actor) return;
    const actorId = n.actor.id;
    start(async () => {
      const res = await respondFollowRequest(actorId, accept);
      if (res.ok) {
        setAnswered((a) => ({ ...a, [n.id]: accept ? "accepted" : "rejected" }));
        router.refresh();
      }
    });
  }

  if (items.length === 0) {
    return <p className="py-16 text-center text-neutral-500">{t("notif.empty")}</p>;
  }

  const hasRead = items.some((n) => !n.unread);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((n) => {
          const who = n.actor?.name ?? "?";
          const res = answered[n.id];
          const text = t(`notif.${n.type}` as DictKey);
          return (
            <li
              key={n.id}
              className={`group relative flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-hover ${
                n.unread
                  ? "border-brand/40 bg-brand/5"
                  : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              {n.actor?.username ? (
                <Link href={`/u/${n.actor.username}`} aria-label={who} className="relative z-10">
                  <Avatar url={n.actor.avatarUrl} size={42} />
                </Link>
              ) : (
                <Avatar url={null} size={42} />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="font-semibold after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg"
                    >
                      {who}
                    </Link>
                  ) : (
                    <strong>{who}</strong>
                  )}{" "}
                  {text}
                  {n.titleName && (
                    <>
                      {" "}
                      {n.titleHref ? (
                        <Link href={n.titleHref} className="relative z-10 font-semibold text-brand-fg hover:underline">
                          {n.titleName}
                        </Link>
                      ) : (
                        <strong>{n.titleName}</strong>
                      )}
                    </>
                  )}
                </p>
                <p className="text-xs text-neutral-500">{ago(n.createdAt, lang)}</p>
              </div>
              {n.unread && <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-label={t("notif.aria")} />}
              {n.type === "follow_request" && n.requestOpen && !res && (
                <div className="relative z-10 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => answer(n, true)}
                    className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {t("profile.accept")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => answer(n, false)}
                    className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {t("profile.reject")}
                  </button>
                </div>
              )}
              {res && (
                <span className="text-xs font-semibold text-neutral-500">
                  {res === "accepted" ? t("profile.accept") : t("profile.reject")} ✓
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {hasRead && (
        <button
          type="button"
          disabled={busy}
          onClick={() => start(async () => { await clearReadNotifications(); router.refresh(); })}
          className="text-sm text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          {t("notif.clear")}
        </button>
      )}
    </div>
  );
}
