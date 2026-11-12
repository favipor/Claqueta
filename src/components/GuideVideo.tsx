"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useI18n } from "./I18nProvider";

const GuideVideoPlayer = dynamic(() => import("./GuideVideoPlayer"), { ssr: false });
export function GuideVideoButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}
      className={`inline-flex items-center gap-2.5 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      {t("video.open")}
    </button>
    {open && <GuideVideoPlayer onClose={() => setOpen(false)} />}
  </>;
}
