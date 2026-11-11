"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

// Caja de texto que, al escribir «@ja», sugiere a tus amigos (gente que sigues o te sigue)
// cuyo usuario o nombre contenga «ja». Se elige con el ratón, con las flechas + Intro/Tab o se cierra con Escape.

type Friend = { username: string; name: string; avatarUrl: string | null };

let friendsCache: Promise<Friend[]> | null = null;

function loadFriends(): Promise<Friend[]> {
  if (friendsCache) return friendsCache;
  friendsCache = (async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const me = session?.user.id;
      if (!me) return [];
      const { data: rows } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .eq("status", "accepted")
        .or(`follower_id.eq.${me},following_id.eq.${me}`)
        .limit(1000);
      const ids = [
        ...new Set((rows ?? []).map((r) => (r.follower_id === me ? r.following_id : r.follower_id) as string)),
      ];
      if (ids.length === 0) return [];
      const { data: people } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .in("id", ids)
        .not("username", "is", null);
      return (people ?? []).map((p) => ({
        username: p.username as string,
        name: (p.display_name as string | null) ?? (p.username as string),
        avatarUrl: (p.avatar_url as string | null) ?? null,
      }));
    } catch {
      friendsCache = null;
      return [];
    }
  })();
  return friendsCache;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Devuelve la mención que se está escribiendo justo antes del cursor (o null)
function currentMention(text: string, caret: number) {
  const m = /(^|\s)@([A-Za-z0-9_]{0,20})$/.exec(text.slice(0, caret));
  if (!m) return null;
  return { query: m[2], start: caret - m[2].length - 1 };
}

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
};

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onValueChange, onKeyDown, className, ...rest },
  ref
) {
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (mention && friends.length === 0) loadFriends().then(setFriends);
  }, [mention, friends.length]);

  const q = mention ? fold(mention.query) : "";
  const matches = mention
    ? friends
        .filter((f) => !q || fold(f.username).includes(q) || fold(f.name).includes(q))
        .sort((a, b) => Number(fold(b.username).startsWith(q)) - Number(fold(a.username).startsWith(q)))
        .slice(0, 6)
    : [];
  const open = matches.length > 0;

  function sync(el: HTMLTextAreaElement) {
    setMention(currentMention(el.value, el.selectionStart ?? el.value.length));
    setActive(0);
  }

  function pick(f: Friend) {
    if (!mention || !inner.current) return;
    const el = inner.current;
    const caret = el.selectionStart ?? value.length;
    const insert = `@${f.username} `;
    const next = value.slice(0, mention.start) + insert + value.slice(caret);
    onValueChange(next);
    setMention(null);
    const pos = mention.start + insert.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a <= 0 ? matches.length - 1 : a - 1));
        return;
      }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
        e.preventDefault();
        pick(matches[active] ?? matches[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <textarea
        {...rest}
        ref={inner}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          sync(e.target);
        }}
        onKeyDown={handleKeyDown}
        onClick={(e) => sync(e.currentTarget)}
        onBlur={() => setTimeout(() => setMention(null), 150)}
        aria-autocomplete="list"
        aria-expanded={open}
        className={className}
      />
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 w-full max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        >
          {matches.map((f, i) => (
            <li key={f.username} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(f)}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm ${
                  i === active ? "bg-brand/10 dark:bg-brand/25" : ""
                }`}
              >
                <Avatar url={f.avatarUrl} size={28} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="block truncate text-xs text-neutral-500">@{f.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
