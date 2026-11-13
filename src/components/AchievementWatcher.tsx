"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { syncAchievements, type NewAchievement } from "@/app/achievement-actions";
import { TIER_NAMES } from "@/lib/achievements";
import { useLoggedIn } from "./MyTitles";
import { useI18n } from "./I18nProvider";

type Toast = { id: number; kind: "new"; a: NewAchievement } | { id: number; kind: "first"; n: number };

const TIER_BG = ["", "from-amber-600 to-orange-500", "from-slate-400 to-slate-600", "from-yellow-400 to-amber-500"];

// Vigila si consigues logros nuevos (al cambiar de página y tras marcar algo) y lo celebra con un aviso
export function AchievementWatcher() {
  const loggedIn = useLoggedIn();
  const pathname = usePathname();
  const { lang } = useI18n();
  const L = lang === "en" ? 1 : 0;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const check = useCallback(async () => {
    last.current = Date.now();
    try {
      const r = await syncAchievements();
      setUsername(r.username);
      const add: Toast[] = r.firstTime
        ? [{ id: Date.now(), kind: "first", n: r.firstTime }]
        : r.fresh.map((a, i) => ({ id: Date.now() + i, kind: "new" as const, a }));
      if (add.length) {
        setToasts((t) => [...t, ...add]);
        add.forEach((x) => setTimeout(() => setToasts((t) => t.filter((y) => y.id !== x.id)), 6500));
      }
    } catch {}
  }, []);

  // Al cambiar de página, como mucho una vez por minuto
  useEffect(() => {
    if (loggedIn && Date.now() - last.current > 60_000) check();
  }, [loggedIn, pathname, check]);

  // Tras marcar o puntuar algo, se comprueba enseguida (agrupando cambios seguidos)
  useEffect(() => {
    if (!loggedIn) return;
    const on = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(check, 1500);
    };
    window.addEventListener("claq:title-changed", on);
    return () => window.removeEventListener("claq:title-changed", on);
  }, [loggedIn, check]);

  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[90] flex flex-col items-center gap-3 px-4" aria-live="polite">
      {toasts.map((t) => (
        <Link
          key={t.id}
          href={username ? `/u/${username}#ach-title` : "#"}
          className="ach-toast pointer-events-auto flex w-full max-w-sm items-center gap-4 overflow-hidden rounded-2xl bg-neutral-950 p-3 pr-5 text-white shadow-2xl ring-1 ring-white/15"
        >
          <span
            className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br text-3xl ${
              t.kind === "new" ? TIER_BG[t.a.tier] : "from-teal-400 to-teal-700"
            }`}
            aria-hidden="true"
          >
            {t.kind === "new" ? t.a.emoji : "🏆"}
            <span className="ach-burst absolute inset-0 rounded-full" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-300">
              {t.kind === "new" ? (L ? "Achievement unlocked!" : "¡Logro desbloqueado!") : L ? "New: achievements" : "Novedad: logros"}
            </span>
            <span className="block truncate text-base font-extrabold">
              {t.kind === "new"
                ? `${t.a.name[L]} · ${TIER_NAMES[t.a.tier - 1][L]}`
                : L
                  ? `You already have ${t.n}. See them on your profile`
                  : `Ya tienes ${t.n}. Míralos en tu perfil`}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
