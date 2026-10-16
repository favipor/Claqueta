"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

export type InboxRow = {
  username: string;
  name: string;
  avatarUrl: string | null;
  incomingRequest: boolean;
  kind: "text" | "recommendation";
  body: string | null;
  title: string | null;
  at: string;
  fromMe: boolean;
  unread: boolean;
};

export function InboxList({ rows }: { rows: InboxRow[] }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<"chats" | "requests">("chats");

  // Si llega un mensaje nuevo, la bandeja se actualiza sola
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      channel = supabase
        .channel(`inbox-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${data.user.id}` },
          () => router.refresh()
        )
        .subscribe();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const requests = rows.filter((r) => r.incomingRequest);
  const chats = rows.filter((r) => !r.incomingRequest);
  const shown = tab === "chats" ? chats : requests;
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });

  const tabCls = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      active ? "bg-brand text-white" : "hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
    }`;

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-full bg-neutral-200/70 p-1 dark:bg-neutral-800/80">
        <button type="button" className={tabCls(tab === "chats")} onClick={() => setTab("chats")}>
          {t("msg.chats")}
        </button>
        <button type="button" className={tabCls(tab === "requests")} onClick={() => setTab("requests")}>
          {t("msg.requests")}
          {requests.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="py-14 text-center text-neutral-500">
          {tab === "chats" ? t("msg.empty") : t("msg.emptyRequests")}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const preview =
              r.kind === "recommendation"
                ? `${t("msg.recommended")}: ${r.title ?? ""}`
                : r.body ?? "";
            return (
              <li key={r.username}>
                <Link
                  href={`/mensajes/${r.username}`}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <Avatar url={r.avatarUrl} size={46} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${r.unread ? "font-extrabold" : "font-semibold"}`}>
                      {r.name}
                    </span>
                    <span
                      className={`block truncate text-sm ${
                        r.unread ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500"
                      }`}
                    >
                      {r.fromMe ? `${t("msg.you")}: ` : ""}
                      {preview}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1 text-xs text-neutral-400">
                    {fmt.format(new Date(r.at))}
                    {r.unread && <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
