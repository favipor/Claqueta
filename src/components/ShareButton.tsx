"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";

// Comparte la página con el menú del móvil (WhatsApp, Instagram...) o copia el enlace en el ordenador
export function ShareButton({ title, text, className = "" }: { title: string; text?: string; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // cancelado: no pasa nada
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-teal-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      <span aria-live="polite">{copied ? t("share.copied") : t("share.button")}</span>
    </button>
  );
}
