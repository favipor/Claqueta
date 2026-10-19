"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteUser, adminSetAdmin, adminSetSilence, type AdminActionError } from "@/app/admin-actions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

export type AdminStats = {
  users: number;
  with_username: number;
  new_7d: number;
  active_7d: number;
  private_profiles: number;
  titles: number;
  comments: number;
  lists: number;
  messages: number;
  admins: number;
  silenced: number;
  open_reports: number;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_silenced: boolean;
  titles: number;
  comments: number;
};

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export function AdminUsers({
  stats,
  users,
  total,
  me,
  q,
  page,
  pageSize,
}: {
  stats: AdminStats | null;
  users: AdminUserRow[];
  total: number;
  me: string;
  q: string;
  page: number;
  pageSize: number;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<AdminActionError | null>(null);
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: AdminActionError }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setConfirmDelete(null);
        router.refresh();
      }
    });
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("pagina", String(p));
    const s = sp.toString();
    return `/admin${s ? `?${s}` : ""}`;
  };

  const small =
    "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <section className="space-y-5" aria-label={t("admin.users")}>
      <h2 className="text-lg font-bold">{t("admin.users")}</h2>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Tile label={t("admin.st.users")} value={stats.users} />
          <Tile label={t("admin.st.new7")} value={stats.new_7d} />
          <Tile label={t("admin.st.active7")} value={stats.active_7d} />
          <Tile label={t("admin.st.private")} value={stats.private_profiles} />
          <Tile label={t("admin.st.titles")} value={stats.titles} />
          <Tile label={t("admin.st.comments")} value={stats.comments} />
          <Tile label={t("admin.st.lists")} value={stats.lists} />
          <Tile label={t("admin.st.admins")} value={stats.admins} />
        </div>
      )}

      <form action="/admin" role="search" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("admin.searchUsers")}
          aria-label={t("admin.searchUsers")}
          className="w-full max-w-md rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          {t("admin.search")}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`admin.err.${error}` as DictKey)}
        </p>
      )}

      <ul className="space-y-2">
        {users.map((u) => {
          const mine = u.id === me;
          return (
            <li
              key={u.id}
              className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Avatar url={u.avatar_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    {u.display_name ?? u.username ?? "—"}
                    {u.username && <span className="font-normal text-neutral-500">@{u.username}</span>}
                    {u.is_admin && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">Admin</span>
                    )}
                    {u.is_silenced && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-neutral-950">
                        {t("admin.silenced")}
                      </span>
                    )}
                    {u.is_private && <span className="text-[11px] font-normal text-neutral-500">🔒</span>}
                    {mine && <span className="text-[11px] font-normal text-neutral-500">({t("admin.you")})</span>}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {u.email} · {t("admin.joined")} {fmt.format(new Date(u.created_at))}
                    {u.last_sign_in_at ? ` · ${t("admin.lastSeen")} ${fmt.format(new Date(u.last_sign_in_at))}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {u.titles} {t("admin.st.titles").toLowerCase()} · {u.comments} {t("admin.st.comments").toLowerCase()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {u.username && (
                  <Link href={`/u/${u.username}`} className={small}>
                    {t("admin.viewProfile")}
                  </Link>
                )}
                {!mine && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => adminSetAdmin(u.id, !u.is_admin))}
                      className={small}
                    >
                      {u.is_admin ? t("admin.removeAdmin") : t("admin.makeAdmin")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => adminSetSilence(u.id, !u.is_silenced))}
                      className={small}
                    >
                      {u.is_silenced ? t("admin.unblock") : t("admin.silence")}
                    </button>
                    {confirmDelete === u.id ? (
                      <>
                        <span className="text-xs text-red-600 dark:text-red-400">{t("admin.confirmDelete")}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => adminDeleteUser(u.id))}
                          className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {t("admin.deleteYes")}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className={small}>
                          {t("cm.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(u.id)}
                        className={`${small} hover:!border-red-400 hover:!text-red-600`}
                      >
                        {t("admin.deleteAccount")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
        {users.length === 0 && <li className="py-8 text-center text-neutral-500">{t("admin.noUsers")}</li>}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Paginación">
          {page > 1 && (
            <Link href={href(page - 1)} className={small}>
              ←
            </Link>
          )}
          <span className="text-neutral-500">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={href(page + 1)} className={small}>
              →
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
