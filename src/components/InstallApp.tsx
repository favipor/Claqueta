"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "./I18nProvider";
import { ClapperIcon } from "./ClapperIcon";

// ---------- Estado compartido de la instalación ----------
// El navegador avisa una sola vez (beforeinstallprompt) de que la web se puede instalar;
// se guarda aquí para que cualquier botón lo pueda usar después.
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
  if ("serviceWorker" in navigator) {
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

type Platform = "standalone" | "ios" | "android" | "desktop";

function detect(): Platform {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "standalone";
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

// Devuelve si hay que enseñar el botón y la función que lanza la instalación.
export function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => !!deferred, () => false);
  const isInstalled = useSyncExternalStore(subscribe, () => installed, () => false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => setPlatform(detect()), []);

  // En móvil siempre se ofrece (si no hay aviso del navegador se explican los pasos);
  // en ordenador solo cuando el navegador permite instalar.
  const visible =
    !!platform && !isInstalled && platform !== "standalone" && (canPrompt || platform === "ios" || platform === "android");

  async function install() {
    if (deferred) {
      const ev = deferred;
      deferred = null;
      emit();
      await ev.prompt();
      await ev.userChoice.catch(() => null);
    } else {
      setHelp(true);
    }
  }

  return { visible, install, help, closeHelp: () => setHelp(false), platform };
}

// ---------- Botón llamativo de la barra superior ----------
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const { visible, install, help, closeHelp, platform } = useInstall();
  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={install}
        aria-label={t("install.cta")}
        title={t("install.title")}
        className={`group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-amber-400 to-orange-500 font-bold text-neutral-950 shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg ${
          compact ? "h-9 w-9 justify-center text-sm xl:w-auto xl:px-3.5" : "px-3.5 py-1.5 text-sm"
        }`}
      >
        {/* Brillo que cruza el botón de vez en cuando para llamar la atención */}
        <span aria-hidden="true" className="install-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <PhoneDownIcon className="relative h-[18px] w-[18px]" />
        <span className={`relative whitespace-nowrap ${compact ? "hidden xl:inline" : ""}`}>{t("install.cta")}</span>
      </button>
      <InstallHelp open={help} onClose={closeHelp} ios={platform === "ios"} />
    </>
  );
}

// ---------- Explicación cuando el navegador no ofrece el aviso (iPhone y algunos Android) ----------
function InstallHelp({ open, onClose, ios }: { open: boolean; onClose: () => void; ios: boolean }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ios ? t("install.iosTitle") : t("install.title")}
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-teal-400 text-white shadow">
                <ClapperIcon className="h-8 w-8" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">{ios ? t("install.iosTitle") : t("install.title")}</h2>
                <p className="text-sm text-neutral-500">{t("install.sub")}</p>
              </div>
            </div>
            {ios ? (
              <ol className="space-y-3 text-sm">
                {[
                  [t("install.ios1"), <ShareIcon key="s" className="h-5 w-5" />],
                  [t("install.ios2"), <PlusSquareIcon key="p" className="h-5 w-5" />],
                  [t("install.ios3"), null],
                ].map(([text, icon], i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2.5 dark:bg-neutral-800">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="flex-1">{text}</span>
                    {icon && <span className="text-brand-fg">{icon}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl bg-neutral-100 px-3 py-3 text-sm dark:bg-neutral-800">{t("install.manual")}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              {t("install.close")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function PhoneDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}

function PlusSquareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
