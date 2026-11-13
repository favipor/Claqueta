"use client";

import { useState, useTransition } from "react";
import { proposePlan } from "@/app/together-actions";
import { useI18n } from "./I18nProvider";

type Meta = { tmdb_id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// «Proponer plan»: elige un día y tu amigo recibe la invitación para ver ese título juntos
export function PlanButton({ friendId, friendName, meta, tone = "light" }: { friendId: string; friendName: string; meta: Meta; tone?: "light" | "dark" }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  // Por defecto, el próximo viernes
  const fri = new Date();
  fri.setDate(fri.getDate() + ((5 - fri.getDay() + 7) % 7 || 7));
  const [date, setDate] = useState(iso(fri));
  const quick = [0, 1, 2].map((k) => {
    const d = new Date();
    d.setDate(d.getDate() + k);
    return { v: iso(d), label: k === 0 ? (L ? "Today" : "Hoy") : k === 1 ? (L ? "Tomorrow" : "Mañana") : d.toLocaleDateString(L ? "en-GB" : "es-ES", { weekday: "short" }) };
  });

  if (sent)
    return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${tone === "dark" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"}`}>✓ {L ? `Sent to ${friendName}` : `Enviado a ${friendName}`}</span>;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 ${
          tone === "dark" ? "bg-white/20 text-white ring-1 ring-white/30 hover:bg-white/30" : "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300"
        }`}
      >
        📅 {L ? "Plan it" : "Proponer plan"}
      </button>
    );

  return (
    <div className={`w-full max-w-xs space-y-2 rounded-2xl p-3 text-left text-sm shadow-xl ring-1 ${tone === "dark" ? "bg-neutral-950/80 text-white ring-white/20" : "bg-white text-neutral-900 ring-neutral-200 dark:bg-neutral-900 dark:text-white dark:ring-neutral-700"}`}>
      <p className="font-bold">{L ? `When do you watch it with ${friendName}?` : `¿Qué día la veis con ${friendName}?`}</p>
      <div className="flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button key={q.v} type="button" onClick={() => setDate(q.v)} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${date === q.v ? "bg-rose-500 text-white ring-rose-500" : "ring-neutral-300 dark:ring-neutral-600"}`}>
            {q.label}
          </button>
        ))}
        <input type="date" value={date} min={quick[0].v} onChange={(e) => setDate(e.target.value)} aria-label={L ? "Date" : "Fecha"} className="rounded-full bg-transparent px-2 py-0.5 text-xs ring-1 ring-neutral-300 dark:ring-neutral-600 [color-scheme:light] dark:[color-scheme:dark]" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await proposePlan(friendId, meta, date);
              if (r.ok) setSent(true);
            })
          }
          className="flex-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-60"
        >
          {pending ? "…" : L ? "Send invite" : "Enviar invitación"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs font-semibold opacity-70 hover:opacity-100">
          {L ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}
