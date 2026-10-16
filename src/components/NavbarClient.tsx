"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { signOut } from "@/app/actions";
import { useI18n } from "./I18nProvider";
import { ClapperIcon } from "./ClapperIcon";
import { Avatar } from "./Avatar";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightIcon, BookmarkIcon, FilmIcon, TvIcon } from "./NavIcons";

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
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    setDark(document.documentElement.classList.contains("dark"));
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

  // El menú móvil se cierra al cambiar de página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

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
    ...(userName ? [{ href: "/mi-lista", label: t("nav.myList"), Icon: BookmarkIcon }] : []),
  ];

  const searchInput = (
    <input
      type="search"
      name="q"
      placeholder={t("nav.search")}
      aria-label={t("nav.search")}
      className="w-full rounded-full border border-neutral-300 bg-neutral-100 px-4 py-1.5 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900"
    />
  );

  const langBtn = (
    <button onClick={toggleLang} className={btn} aria-label={t("nav.lang")}>
            {lang.toUpperCase()}
          </button>
  );

  const themeBtn = (
    <button onClick={toggleTheme} className={btn} aria-label={t("nav.theme")} title={t("nav.theme")}>
            {/* Cuadrado partido en diagonal (/): al cambiar de tema, las mitades se invierten girando */}
            <span className="block h-6 w-6 overflow-hidden rounded-sm border-2 border-neutral-900 dark:border-white">
              <span className="block h-full w-full rotate-180 bg-[linear-gradient(to_bottom_right,#000_50%,#fff_50%)] transition-transform duration-500 ease-in-out dark:rotate-0" />
            </span>
          </button>
  );

  return (
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
          <span className={scrolled ? "hidden text-lg sm:inline" : "text-2xl"}>Claqueta</span>
        </Link>

        <form action="/buscar" className="mx-auto hidden min-w-0 flex-1 sm:block sm:max-w-md" role="search">
          {searchInput}
        </form>

        <nav className="ml-auto flex items-center gap-1 sm:ml-0" aria-label="Principal">
          {/* Pastilla de navegación: el resaltado teal se desliza hasta la sección activa */}
          <div className="mr-1 hidden items-center gap-0.5 rounded-full bg-neutral-200/70 p-1 lg:flex dark:bg-neutral-800/80">
            {links.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg ${
                    active
                      ? "text-white"
                      : "text-neutral-700 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
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
              <Link
                href={profileHref}
                aria-label={
                  hasNew ? `${t("nav.profile")} (${t("notif.aria")})` : t("nav.profile")
                }
                title={userName}
                className="relative rounded-full transition duration-200 hover:scale-110 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
              >
                <Avatar url={account?.avatarUrl} size={34} />
                {hasNew && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-neutral-950"
                  />
                )}
              </Link>
              {themeBtn}
              {langBtn}
              {account?.isAdmin && (
                <Link href="/admin" className={`${btn} hidden lg:block`}>
                  Admin
                  {account.openReports > 0 && (
                    <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                      {account.openReports}
                    </span>
                  )}
                </Link>
              )}
              <Link href="/ajustes" className={`${btn} hidden lg:block`}>
                {t("nav.settings")}
              </Link>
              <form action={signOut} className="hidden lg:block">
                <button type="submit" className={btn}>
                  {t("nav.logout")}
                </button>
              </form>
            </div>
          ) : (
            <>
              {themeBtn}
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
          <form action="/buscar" role="search" className="mb-2 sm:hidden">
            {searchInput}
          </form>
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href;
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
          {account && (
            <>
              <Link href={profileHref} className={`${base} block text-neutral-700 dark:text-neutral-200`}>
                {account.username ? t("nav.profile") : t("onb.pill")}
              </Link>
              {account.username && (
                <Link href="/ajustes" className={`${base} block text-neutral-700 dark:text-neutral-200`}>
                  {t("nav.settings")}
                </Link>
              )}
              {account.isAdmin && (
                <Link href="/admin" className={`${base} block text-neutral-700 dark:text-neutral-200`}>
                  Admin{account.openReports > 0 ? ` (${account.openReports})` : ""}
                </Link>
              )}
            </>
          )}
          {userName && (
            <form action={signOut}>
              <button type="submit" className={`${btn} block w-full text-left`}>
                {t("nav.logout")}
              </button>
            </form>
          )}
        </div>
      )}
    </header>
  );
}
