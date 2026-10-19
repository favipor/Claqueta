"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";

// Copia (o comparte) el enlace de tu perfil para invitar a gente sin que tengan que buscarte.
export function ShareProfile({ username, className = "" }: { username: string; className?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);

  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Claqueta", text: t("disc.shareText"), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      // si el navegador no deja copiar, se muestra el enlace para copiarlo a mano
      window.prompt(t("disc.copyManual"), url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg dark:border-neutral-700 dark:hover:bg-neutral-800 ${className}`}
    >
      {done ? t("disc.copied") : t("disc.invite")}
    </button>
  );
}
