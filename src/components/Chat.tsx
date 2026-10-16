"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addToPending, markConversationRead, respondRequest, sendMessage, type DmError } from "@/app/dm-actions";
import { img } from "@/lib/tmdb";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

export type ChatMessage = {
  id: string;
  mine: boolean;
  kind: "text" | "recommendation";
  body: string | null;
  tmdb_id: number | null;
  media_type: "movie" | "tv" | null;
  title: string | null;
  poster_path: string | null;
  created_at: string;
};

export type ChatMode =
  | "free" // se puede escribir
  | "first_request" // no se siguen y no hay conversación: el primer mensaje es una solicitud
  | "sent_request" // he enviado solicitud, sin contestar
  | "incoming_request" // me han enviado solicitud: hay que aceptar o rechazar
  | "declined" // mi solicitud fue rechazada
  | "blocked";

type Other = { id: string; username: string; name: string; avatarUrl: string | null };

const COLS = "id, sender_id, recipient_id, kind, body, tmdb_id, media_type, title, poster_path, created_at";

function toMsg(r: any, me: string): ChatMessage {
  return {
    id: r.id,
    mine: r.sender_id === me,
    kind: r.kind,
    body: r.body,
    tmdb_id: r.tmdb_id,
    media_type: r.media_type,
    title: r.title,
    poster_path: r.poster_path,
    created_at: r.created_at,
  };
}

function RecommendationCard({ m }: { m: ChatMessage }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "added" | "already">("idle");
  const [busy, start] = useTransition();
  const src = img(m.poster_path, "w185");
  return (
    <div className="flex w-64 gap-3 rounded-2xl border border-neutral-200 bg-white p-3 text-left text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
      {src ? (
        <Image src={src} alt="" width={64} height={96} className="h-24 w-16 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="h-24 w-16 shrink-0 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t("msg.recommended")}</p>
        <Link
          href={`/titulo/${m.media_type}/${m.tmdb_id}`}
          className="line-clamp-2 text-sm font-bold hover:underline"
          title={t("msg.openTitle")}
        >
          {m.title}
        </Link>
        {m.body && <p className="line-clamp-3 text-xs text-neutral-600 dark:text-neutral-300">{m.body}</p>}
        {!m.mine && (
          <button
            type="button"
            disabled={busy || state !== "idle"}
            onClick={() =>
              start(async () => {
                const res = await addToPending({
                  tmdb_id: m.tmdb_id!,
                  media_type: m.media_type!,
                  title: m.title!,
                  poster_path: m.poster_path,
                });
                if (res.ok) setState(res.already ? "already" : "added");
              })
            }
            className="mt-auto rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
          >
            {state === "added" ? t("msg.added") : state === "already" ? t("msg.alreadyIn") : t("msg.addPending")}
          </button>
        )}
      </div>
    </div>
  );
}

export function Chat({
  me,
  other,
  initial,
  mode: initialMode,
}: {
  me: string;
  other: Other;
  initial: ChatMessage[];
  mode: ChatMode;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [mode, setMode] = useState(initialMode);
  const [text, setText] = useState("");
  const [error, setError] = useState<DmError | null>(null);
  const [busy, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(initial.length);

  const reload = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select(COLS)
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me})`
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setMessages(data.reverse().map((r) => toMsg(r, me)));
  }, [me, other.id]);

  // Al abrir: se marca como leída la conversación
  useEffect(() => {
    markConversationRead(other.id);
  }, [other.id]);

  // Mensajes nuevos en tiempo real (con una consulta de respaldo cada 20 s)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-${me}-${other.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
        (payload) => {
          if ((payload.new as any).sender_id === other.id) {
            reload();
            markConversationRead(other.id);
          }
        }
      )
      .subscribe();
    const poll = setInterval(reload, 20000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [me, other.id, reload]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > lastCount.current ? "smooth" : "auto" });
    lastCount.current = messages.length;
  }, [messages]);

  function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setError(null);
    start(async () => {
      const res = await sendMessage(other.id, body);
      if (!res.ok) return setError(res.error);
      setText("");
      if (mode === "first_request") setMode("sent_request");
      await reload();
    });
  }

  function answer(accept: boolean) {
    start(async () => {
      const res = await respondRequest(other.id, accept);
      if (!res.ok) return;
      if (accept) setMode("free");
      else router.push("/mensajes");
      router.refresh();
    });
  }

  const canWrite = mode === "free" || mode === "first_request" || mode === "sent_request";
  const fmt = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] min-h-[420px] max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Link href="/mensajes" aria-label={t("msg.back")} className="rounded-full px-2 py-1 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
          ←
        </Link>
        <Link href={`/u/${other.username}`} className="flex min-w-0 items-center gap-3 hover:opacity-80">
          <Avatar url={other.avatarUrl} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{other.name}</span>
            <span className="block truncate text-xs text-neutral-500">@{other.username}</span>
          </span>
        </Link>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-neutral-500">{t("msg.noMessages")}</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
            {m.kind === "recommendation" ? (
              <RecommendationCard m={m} />
            ) : (
              <p
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                  m.mine
                    ? "rounded-br-md bg-brand text-white"
                    : "rounded-bl-md bg-neutral-100 dark:bg-neutral-800"
                }`}
              >
                {m.body}
              </p>
            )}
            <span className="mt-0.5 px-1 text-[11px] text-neutral-400">{fmt.format(new Date(m.created_at))}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <footer className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        {mode === "incoming_request" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
            <span className="flex-1">
              <strong>{other.name}</strong> {t("msg.requestIncoming")}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => answer(true)}
              className="rounded-full bg-brand px-4 py-1.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {t("profile.accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => answer(false)}
              className="rounded-full border border-neutral-300 px-4 py-1.5 font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {t("profile.reject")}
            </button>
          </div>
        )}
        {mode === "first_request" && <p className="px-1 text-xs text-neutral-500">{t("msg.firstIsRequest")}</p>}
        {mode === "sent_request" && <p className="px-1 text-xs text-neutral-500">{t("msg.requestSent")}</p>}
        {mode === "declined" && <p className="px-1 text-sm text-neutral-500">{t("msg.declined")}</p>}
        {mode === "blocked" && <p className="px-1 text-sm text-neutral-500">{t("msg.blocked")}</p>}
        {error && (
          <p role="alert" className="px-1 text-sm text-red-600 dark:text-red-400">
            {t(`msg.err.${error}` as DictKey)}
          </p>
        )}
        {canWrite && (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={t("msg.write")}
              aria-label={t("msg.write")}
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="button"
              onClick={submit}
              disabled={busy || text.trim() === ""}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {t("msg.send")}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
