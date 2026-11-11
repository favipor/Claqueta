"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { img, type TmdbItem } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { Avatar } from "./Avatar";

type Person = { username: string; name: string; avatarUrl: string | null };
type Option = { key: string; href: string; kind: "title"; item: TmdbItem } | { key: string; href: string; kind: "person"; person: Person };

// Buscador con sugerencias: al escribir «jueg» ya aparecen «Juego de tronos», «El juego del calamar»…
// Se puede usar con el teclado (flechas, Intro y Escape). Intro sin elegir nada abre la página de resultados.
export function SearchBox({
  className = "",
  inputClassName = "",
  dark = false,
}: {
  className?: string;
  inputClassName?: string;
  dark?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.replace(/^@/, "").length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { titles: TmdbItem[]; people: Person[] };
        setOptions([
          ...data.titles.map((item) => ({
            key: `t-${item.media_type}-${item.id}`,
            href: `/titulo/${item.media_type}/${item.id}`,
            kind: "title" as const,
            item,
          })),
          ...data.people.map((person) => ({
            key: `p-${person.username}`,
            href: `/u/${person.username}`,
            kind: "person" as const,
            person,
          })),
        ]);
        setActive(-1);
      } catch {
        // búsqueda cancelada o sin conexión: no se muestran sugerencias
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // Se cierra al pulsar fuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
      e.preventDefault();
      go(options[active].href);
    }
  }

  const showList = open && q.trim().replace(/^@/, "").length >= 2 && (options.length > 0 || loading);
  const titles = options.filter((o) => o.kind === "title");
  const people = options.filter((o) => o.kind === "person");

  const row = (o: Option) => {
    const i = options.indexOf(o);
    const isActive = i === active;
    return (
      <li key={o.key} id={`${listId}-${i}`} role="option" aria-selected={isActive}>
        <button
          type="button"
          tabIndex={-1}
          onMouseEnter={() => setActive(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => go(o.href)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
            isActive ? "bg-brand/10 dark:bg-brand/25" : ""
          }`}
        >
          {o.kind === "title" ? (
            <>
              <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                {o.item.poster_path && (
                  <Image src={img(o.item.poster_path, "w92")!} alt="" fill sizes="32px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-1 font-semibold">{o.item.title}</span>
                <span className="text-xs text-neutral-500">
                  {t(`kind.${o.item.media_type}` as const)}
                  {o.item.year ? ` · ${o.item.year}` : ""}
                </span>
              </span>
            </>
          ) : (
            <>
              <Avatar url={o.person.avatarUrl} size={32} />
              <span className="min-w-0">
                <span className="line-clamp-1 font-semibold">{o.person.name}</span>
                <span className="text-xs text-neutral-500">@{o.person.username}</span>
              </span>
            </>
          )}
        </button>
      </li>
    );
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form action="/buscar" role="search" onSubmit={() => setOpen(false)}>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("nav.search")}
          aria-label={t("nav.search")}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className={inputClassName}
        />
      </form>
      {showList && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white py-2 text-left text-neutral-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 ${
            dark ? "ring-1 ring-black/10" : ""
          }`}
        >
          <ul id={listId} role="listbox" aria-label={t("nav.search")}>
            {titles.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("suggest.titles")}
              </li>
            )}
            {titles.map(row)}
            {people.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("suggest.people")}
              </li>
            )}
            {people.map(row)}
            {loading && options.length === 0 && (
              <li role="presentation" className="px-3 py-2 text-sm text-neutral-500">
                {t("catalog.loading")}
              </li>
            )}
          </ul>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go(`/buscar?q=${encodeURIComponent(q.trim())}`)}
            className="mt-1 block w-full border-t border-neutral-200 px-3 pt-2 text-left text-sm font-semibold text-brand-fg hover:underline dark:border-neutral-700"
          >
            {t("suggest.seeAll")} «{q.trim()}»
          </button>
        </div>
      )}
    </div>
  );
}
