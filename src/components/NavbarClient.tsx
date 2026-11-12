"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { signOut } from "@/app/actions";
import { useI18n } from "./I18nProvider";
import { ClapperIcon } from "./ClapperIcon";
import { Avatar } from "./Avatar";
import { createClient } from "@/lib/supabase/client";
import { SearchBox } from "./SearchBox";
import { InstallButton } from "./InstallApp";
import { AppBadge } from "./AppBadge";
import { Suspense } from "react";
import { ArrowRightIcon, BookIcon, BookmarkIcon, FilmIcon, TvIcon, UsersIcon } from "./NavIcons";

export type Account = {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  pendingRequests: number;
  unread: number;
  isAdmin: boolean;
  openReports: number;
};

export function NavbarClient({ account }: { account: Account | null }) {
  const userName = account?.name ?? null;
  const profileHref = account?.username ? `/u/${account.username}` : "/bienvenida";
  const { lang, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false); // desplegable de la foto de perfil
  const menuRef = useRef<HTMLDivElement>(null);

  // Al encogerse la barra cambia la altura de la página y con ella el scroll. Con un solo umbral
  // la barra entraba en bucle (encoger -> sube el scroll -> crecer -> baja...) y parpadeaba.
  // Por eso se encoge pasado 80 px y solo vuelve a crecer por debajo de 8 px.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((was) => (was ? y > 8 : y > 80));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Notificaciones nuevas en tiempo real: se refresca el punto rojo
  const accountId = account?.userId;
  useEffect(() => {
    if (!accountId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${accountId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${accountId}` },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, router]);

  const hasNew = !!account && (account.unread > 0 || account.pendingRequests > 0);

  // Los menús se cierran al cambiar de página
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  // El desplegable de la cuenta se cierra al pulsar fuera o con Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function toggleLang() {
    const next = lang === "es" ? "en" : "es";
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const base =
    "rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-neutral-200/70 dark:hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg";
  const btn = `${base} text-neutral-700 dark:text-neutral-200`;

  const links = [
    { href: "/peliculas", label: t("nav.movies"), Icon: FilmIcon },
    { href: "/series", label: t("nav.series"), Icon: TvIcon },
    ...(userName
      ? [
          { href: "/mi-lista", label: t("nav.myList"), Icon: BookmarkIcon },
          { href: "/calendario", label: t("nav.calendar"), Icon: CalendarIcon },
          { href: "/actividad", label: t("nav.friends"), Icon: UsersIcon },
        ]
      : []),
    ...(userName ? [] : [{ href: "/guia", label: t("nav.guide"), Icon: BookIcon }]),
  ];
  // «Amigos» queda marcado también en Descubrir gente
  const isActive = (href: string) => pathname === href || (href === "/actividad" && pathname === "/descubrir");

  const searchClass =
    "w-full rounded-full border border-neutral-300 bg-neutral-100 px-4 py-1.5 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900";

  const langBtn = (
    <button onClick={toggleLang} className={`${btn} hidden sm:block`} aria-label={t("nav.lang")}>
            {lang.toUpperCase()}
          </button>
  );


  return (
    <>
    {account && (
      <Suspense fallback={null}>
        <AppBadge unread={account.unread + account.pendingRequests} />
      </Suspense>
    )}
    <header
      className={`sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur transition-all dark:border-neutral-800 dark:bg-neutral-950/85 ${
        scrolled ? "py-1.5 shadow-sm" : "py-3"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4">
        <Link
          id="nav-logo"
          href="/"
          className="logo-link flex items-center gap-2 font-extrabold tracking-tight text-brand-fg"
          aria-label="Claqueta"
        >
          <ClapperIcon className={`transition-all ${scrolled ? "h-6 w-6" : "h-8 w-8"}`} />
          <span className={scrolled ? "hidden text-lg sm:inline" : "hidden text-2xl min-[380px]:inline"}>Claqueta</span>
        </Link>

        <SearchBox className="mx-auto hidden min-w-0 flex-1 sm:block sm:max-w-md" inputClassName={searchClass} />

        <nav className="ml-auto flex items-center gap-1 sm:ml-0" aria-label="Principal">
          <Link
            href="/buscar"
            aria-label={t("nav.search")}
            className={`${btn} grid h-9 w-9 place-items-center sm:hidden`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          {/* Pastilla de navegación: el resaltado teal se desliza hasta la sección activa */}
          <div className="mr-1 hidden items-center gap-0.5 rounded-full bg-neutral-200/70 p-1 lg:flex dark:bg-neutral-800/80">
            {links.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg ${
                    active
                      ? "text-white"
                      : "text-neutral-700 hover:bg-white hover:text-brand-fg hover:shadow-sm hover:ring-1 hover:ring-black/5 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white dark:hover:ring-white/10"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-brand shadow"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{label}</span>
                </Link>
              );
            })}
          </div>

          {userName ? (
            <div className="flex items-center gap-2">
              {account && !account.username && (
                <Link
                  href="/bienvenida"
                  className="hidden rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-neutral-950 shadow hover:bg-amber-400 sm:inline-block"
                >
                  {t("onb.pill")}
                </Link>
              )}
              <InstallButton compact />
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenu((m) => !m)}
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  aria-label={hasNew ? `${t("nav.account")} (${t("notif.aria")})` : t("nav.account")}
                  title={userName}
                  className="relative block rounded-full transition duration-200 hover:scale-110 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
                >
                  <Avatar url={account?.avatarUrl} size={34} />
                  {hasNew && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-neutral-950"
                    />
                  )}
                </button>
                <AnimatePresence>
                  {menu && account && (
                    <motion.div
                      role="menu"
                      initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-center gap-3 px-3 pb-2.5 pt-2">
                        <Avatar url={account.avatarUrl} size={38} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{account.name}</p>
                          {account.username && <p className="truncate text-xs text-neutral-500">@{account.username}</p>}
                        </div>
                      </div>
                      <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      <Link role="menuitem" href={profileHref} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
                        <UserIcon className="h-4 w-4" />
                        <span className="flex-1">{account.username ? t("nav.profile") : t("onb.pill")}</span>
                        {hasNew && <span aria-label={t("notif.aria")} className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                      </Link>
                      {account.username && (
                        <Link role="menuitem" href={`/u/${account.username}/resumen`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
                          <SparkIcon className="h-4 w-4" />
                          {t("year.menu")} {new Date().getFullYear()}
                        </Link>
                      )}
                      {account.username && (
                        <Link role="menuitem" href={`/invitar/${account.username}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
                          <span aria-hidden="true" className="w-4 text-center">💌</span>
                          {t("invite.menu")}
                        </Link>
                      )}
                      <Link role="menuitem" href="/guia" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
                        <BookIcon className="h-4 w-4" />
                        {t("nav.guide")}
                      </Link>
                      {account.username && (
                        <Link role="menuitem" href="/ajustes" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
                          <GearIcon className="h-4 w-4" />
                          {t("nav.settings")}
                        </Link>
                      )}
                      <form action={signOut}>
                        <button type="submit" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800 w-full text-left">
                          <LogoutIcon className="h-4 w-4" />
                          {t("nav.logout")}
                        </button>
                      </form>
                      {account.isAdmin && (
                        <>
                          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                          <Link role="menuitem" href="/admin" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
                            <ShieldIcon className="h-4 w-4" />
                            <span className="flex-1">Admin</span>
                            {account.openReports > 0 && (
                              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                                {account.openReports}
                              </span>
                            )}
                          </Link>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {langBtn}
            </div>
          ) : (
            <>
              <InstallButton compact />
              {langBtn}
              <Link
              href="/login"
              className="group ml-1 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-teal-800 px-5 py-2 text-sm font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
            >
              {t("nav.login")}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </>
          )}

          {/* Botón de menú: solo en pantallas pequeñas y medianas */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`${btn} lg:hidden`}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </nav>
      </div>

      {open && (
        <div id="mobile-menu" className="mx-auto mt-2 max-w-6xl space-y-1 border-t border-neutral-200 px-4 pt-3 lg:hidden dark:border-neutral-800">
          {links.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${base} flex items-center gap-2 ${
                  active ? "bg-brand text-white hover:bg-brand" : "text-neutral-700 dark:text-neutral-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={toggleLang}
            className={`${base} flex w-full items-center justify-between text-neutral-700 sm:hidden dark:text-neutral-200`}
          >
            {t("nav.lang")}
            <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-bold dark:bg-neutral-800">{lang.toUpperCase()}</span>
          </button>
        </div>
      )}
    </header>
    </>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
      <path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
