"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleChallenge } from "@/app/together-actions";
import { useI18n } from "./I18nProvider";

// Apuntarse o salirse de un reto
export function ChallengeJoin({ code, joined }: { code: string; joined: boolean }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const router = useRouter();
  const [on, setOn] = useState(joined);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleChallenge(code, !on);
          if (r.ok) {
            setOn(!on);
            router.refresh();
          }
        })
      }
      className={`rounded-full px-4 py-2 text-sm font-extrabold shadow-md transition hover:-translate-y-0.5 disabled:opacity-60 ${on ? "bg-white/20 text-white ring-1 ring-white/50" : "bg-white text-neutral-900"}`}
    >
      {on ? (L ? "✓ Joined" : "✓ Apuntado") : L ? "Join challenge" : "Apuntarme"}
    </button>
  );
}
