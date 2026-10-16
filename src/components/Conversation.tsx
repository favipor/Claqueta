"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  deleteComment,
  editComment,
  listComments,
  postComment,
  reportComment,
  type CommentError,
} from "@/app/comment-actions";
import { VISIBILITIES, type CommentPage, type CommentView, type Visibility } from "@/lib/comments";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

// Convierte @usuario en enlaces a su perfil
function renderBody(body: string) {
  return body.split(/(@[A-Za-z0-9_]{3,20})/g).map((part, i) =>
    /^@[A-Za-z0-9_]{3,20}$/.test(part) ? (
      <a key={i} href={`/u/${part.slice(1).toLowerCase()}`} className="font-semibold text-brand-fg hover:underline">
        {part}
      </a>
    ) : (
      part
    )
  );
}

export type Viewer = {
  id: string;
  username: string | null;
  isAdmin: boolean;
  blocked: boolean;
};

const VIS_ICON: Record<Visibility, string> = { publico: "🌍", amigos: "👥", privado: "🔒" };

// ---------------------------------------------------------------- formulario

function Composer({
  placeholder,
  submitLabel,
  initial,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  initial?: { body: string; visibility: Visibility; spoiler: boolean };
  autoFocus?: boolean;
  onSubmit: (v: { body: string; visibility: Visibility; spoiler: boolean }) => Promise<CommentError | null>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [body, setBody] = useState(initial?.body ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "publico");
  const [spoiler, setSpoiler] = useState(initial?.spoiler ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CommentError | null>(null);

  // Se recuerda la última visibilidad elegida (solo en mensajes nuevos)
  useEffect(() => {
    if (initial) return;
    try {
      const saved = localStorage.getItem("cm-visibility") as Visibility | null;
      if (saved && VISIBILITIES.includes(saved)) setVisibility(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const err = await onSubmit({ body: text, visibility, spoiler });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    try {
      localStorage.setItem("cm-visibility", visibility);
    } catch {}
    if (!initial) {
      setBody("");
      setSpoiler(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Intro envía (como en un chat); Mayús+Intro hace salto de línea
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={1000}
        rows={2}
        autoFocus={autoFocus}
        className="w-full resize-y rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950"
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="sr-only">{t("cm.visibility")}</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-950"
          >
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {VIS_ICON[v]} {t(`cm.vis.${v}` as const)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={spoiler}
            onChange={(e) => setSpoiler(e.target.checked)}
            className="h-4 w-4 accent-teal-600"
          />
          {t("cm.spoiler")}
        </label>
        <span className="ml-auto text-xs text-neutral-500">{body.length}/1000</span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {t("cm.cancel")}
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || body.trim() === ""}
          className="rounded-full bg-brand px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
      <p className="text-xs text-neutral-500">{t(`cm.visHint.${visibility}` as const)}</p>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`cm.err.${error}` as const)}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- un mensaje

function Message({
  c,
  viewer,
  isReply,
  onChanged,
  onReply,
  replyTarget,
  renderReplyBox,
}: {
  c: CommentView;
  viewer: Viewer | null;
  isReply: boolean;
  onChanged: () => void;
  onReply: (id: string | null) => void;
  replyTarget: string | null;
  renderReplyBox: (rootId: string) => React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);

  const mine = viewer?.id === c.user_id;
  const canDelete = mine || !!viewer?.isAdmin;
  const name = c.author?.display_name || c.author?.username || "?";

  function ago(iso: string) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return t("cm.now");
    const rtf = new Intl.RelativeTimeFormat(lang === "en" ? "en" : "es", { numeric: "auto" });
    if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
    if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
    if (s < 86400 * 30) return rtf.format(-Math.floor(s / 86400), "day");
    return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES");
  }

  async function remove() {
    const res = await deleteComment(c.id);
    if (res.ok) onChanged();
  }

  async function sendReport() {
    const res = await reportComment(c.id, reason);
    if (res.ok) {
      setReported(true);
      setReporting(false);
    }
  }

  const link = "text-xs font-medium text-neutral-500 hover:text-brand-fg hover:underline";

  return (
    <div className="flex gap-3">
      {c.author?.username ? (
        <Link href={`/u/${c.author.username}`} className="shrink-0" aria-label={name}>
          <Avatar url={c.author.avatar_url} size={isReply ? 32 : 40} />
        </Link>
      ) : (
        <Avatar url={null} size={isReply ? 32 : 40} />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {c.author?.username ? (
            <Link href={`/u/${c.author.username}`} className="text-sm font-semibold hover:underline">
              {name}
            </Link>
          ) : (
            <span className="text-sm font-semibold">{name}</span>
          )}
          {c.author?.username && <span className="text-xs text-neutral-500">@{c.author.username}</span>}
          <span className="text-xs text-neutral-500">· {ago(c.created_at)}</span>
          {c.edited_at && <span className="text-xs text-neutral-500">· {t("cm.edited")}</span>}
          {c.visibility !== "publico" && (
            <span
              title={t(`cm.vis.${c.visibility}` as const)}
              className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-800"
            >
              {VIS_ICON[c.visibility]} {t(`cm.vis.${c.visibility}` as const)}
            </span>
          )}
        </div>

        {editing ? (
          <Composer
            autoFocus
            placeholder={t("cm.placeholder")}
            submitLabel={t("detail.save")}
            initial={{ body: c.body, visibility: c.visibility, spoiler: c.spoiler }}
            onCancel={() => setEditing(false)}
            onSubmit={async (v) => {
              const res = await editComment({ id: c.id, ...v });
              if (res.ok) {
                setEditing(false);
                onChanged();
                return null;
              }
              return res.error;
            }}
          />
        ) : c.spoiler && !revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-lg border border-dashed border-amber-500/60 bg-amber-500/10 px-3 py-2 text-left text-sm font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
          >
            ⚠️ {t("cm.spoilerHidden")}
          </button>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{renderBody(c.body)}</p>
        )}

        {!editing && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
            {viewer && !viewer.blocked && viewer.username && (
              <button
                type="button"
                className={link}
                onClick={() => onReply(replyTarget === c.id ? null : c.id)}
              >
                {t("cm.reply")}
              </button>
            )}
            {mine && (
              <button type="button" className={link} onClick={() => setEditing(true)}>
                {t("cm.edit")}
              </button>
            )}
            {canDelete &&
              (confirmDelete ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={remove} className="font-semibold text-red-600 hover:underline dark:text-red-400">
                    {t("cm.confirmDelete")}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-neutral-500 hover:underline">
                    {t("cm.cancel")}
                  </button>
                </span>
              ) : (
                <button type="button" className={link} onClick={() => setConfirmDelete(true)}>
                  {mine ? t("cm.delete") : t("cm.deleteAdmin")}
                </button>
              ))}
            {viewer && !mine &&
              (reported ? (
                <span className="text-xs text-neutral-500">✓ {t("cm.reported")}</span>
              ) : (
                <button type="button" className={link} onClick={() => setReporting((r) => !r)}>
                  {t("cm.report")}
                </button>
              ))}
          </div>
        )}

        {reporting && (
          <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <label className="block text-xs text-neutral-500" htmlFor={`rep-${c.id}`}>
              {t("cm.reportReason")}
            </label>
            <input
              id={`rep-${c.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendReport}
                className="rounded-full bg-red-600 px-4 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                {t("cm.reportSend")}
              </button>
              <button
                type="button"
                onClick={() => setReporting(false)}
                className="rounded-full border border-neutral-300 px-4 py-1 text-xs dark:border-neutral-700"
              >
                {t("cm.cancel")}
              </button>
            </div>
          </div>
        )}

        {!isReply && (
          <>
            {c.replies.length > 0 && (
              <div className="mt-3 space-y-4 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
                {c.replies.map((r) => (
                  <Message
                    key={r.id}
                    c={r}
                    viewer={viewer}
                    isReply
                    onChanged={onChanged}
                    onReply={() => onReply(c.id)}
                    replyTarget={replyTarget}
                    renderReplyBox={renderReplyBox}
                  />
                ))}
              </div>
            )}
            {replyTarget === c.id && <div className="mt-3">{renderReplyBox(c.id)}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- conversación

export function Conversation({
  tmdbId,
  mediaType,
  initial,
  viewer,
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  initial: CommentPage;
  viewer: Viewer | null;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<CommentView[]>(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const countRef = useRef(initial.items.length);
  countRef.current = items.length;

  // Vuelve a pedir lo que ya está cargado (tras escribir, editar, borrar o recibir un aviso)
  const reload = useCallback(async () => {
    const page = await listComments(tmdbId, mediaType, 0, Math.max(20, countRef.current));
    if (page) {
      setItems(page.items);
      setHasMore(page.hasMore);
    }
  }, [tmdbId, mediaType]);

  // Tiempo real: cuando alguien escribe en este título, se recarga (y una recarga cada 45 s por si acaso)
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(reload, 400);
    };
    const channel = supabase
      .channel(`comments-${mediaType}-${tmdbId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `tmdb_id=eq.${tmdbId}` },
        soon
      )
      .subscribe();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 45000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [tmdbId, mediaType, reload]);

  async function loadMore() {
    setLoadingMore(true);
    const page = await listComments(tmdbId, mediaType, items.length, 20);
    if (page) {
      setItems((cur) => [...cur, ...page.items.filter((n) => !cur.some((c) => c.id === n.id))]);
      setHasMore(page.hasMore);
    }
    setLoadingMore(false);
  }

  const canWrite = !!viewer && !viewer.blocked && !!viewer.username;

  const send =
    (parent: string | null) =>
    async (v: { body: string; visibility: Visibility; spoiler: boolean }): Promise<CommentError | null> => {
      const res = await postComment({ tmdb_id: tmdbId, media_type: mediaType, parent_id: parent, ...v });
      if (res.ok) {
        if (parent) setReplyTo(null);
        await reload();
        return null;
      }
      return res.error;
    };

  return (
    <section aria-label={t("cm.title")} className="mx-auto max-w-3xl space-y-5">
      <h2 className="text-center text-lg font-bold">💬 {t("cm.title")}</h2>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {canWrite ? (
          <Composer placeholder={t("cm.placeholder")} submitLabel={t("cm.send")} onSubmit={send(null)} />
        ) : !viewer ? (
          <p className="text-center text-sm text-neutral-500">
            <Link href="/login" className="font-semibold text-brand-fg underline">
              {t("nav.login")}
            </Link>{" "}
            {t("cm.loginToChat")}
          </p>
        ) : viewer.blocked ? (
          <p className="text-center text-sm text-red-600 dark:text-red-400">{t("cm.err.blocked")}</p>
        ) : (
          <p className="text-center text-sm text-neutral-500">
            <Link href="/bienvenida" className="font-semibold text-brand-fg underline">
              {t("onb.pill")}
            </Link>{" "}
            {t("cm.needUsername")}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">{t("cm.empty")}</p>
      ) : (
        <ul className="space-y-6">
          <AnimatePresence initial={false}>
            {items.map((c) => (
              <motion.li
                key={c.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0 : 0.25 }}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Message
                  c={c}
                  viewer={viewer}
                  isReply={false}
                  onChanged={reload}
                  onReply={setReplyTo}
                  replyTarget={replyTo}
                  renderReplyBox={(rootId) => (
                    <Composer
                      autoFocus
                      placeholder={t("cm.replyPlaceholder")}
                      submitLabel={t("cm.reply")}
                      onSubmit={send(rootId)}
                      onCancel={() => setReplyTo(null)}
                    />
                  )}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {loadingMore ? t("catalog.loading") : t("cm.loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}
