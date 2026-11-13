"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useI18n } from "./I18nProvider";

// Botón redondo de modo día / noche, abajo a la derecha (encima del de accesibilidad).
// En modo día muestra una luna (pasar a noche) y en modo noche un sol (pasar a día).
export function ThemeToggle() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  const label = dark ? t("theme.toLight") : t("theme.toDark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="float-btn fixed bottom-[4.75rem] right-5 z-50 grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-neutral-900 text-white shadow-lg transition hover:scale-110 hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
    >
      <AnimatePresence mode="wait" initial={false}>
        {dark !== null && (
          <motion.svg
            key={dark ? "sun" : "moon"}
            viewBox="0 0 24 24"
            className="h-[22px] w-[22px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            initial={reduce ? false : { rotate: -90, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { rotate: 90, scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {dark ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
              </>
            ) : (
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            )}
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}
