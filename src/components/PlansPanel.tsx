"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setPlanStatus } from "@/app/together-actions";
import { img } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";

export type Plan = {
  id: string;
  creator_id: string;
  invitee_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  plan_date: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
};

// Vuestros planes: propuestas pendientes (aceptar / no puedo) y planes confirmados
export function PlansPanel({ plans, meId, friendName }: { plans: Plan[]; meId: string; friendName: string }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const [list, setList] = useState(plans);
  const [pending, start] = useTransition();
  if (!list.length) return null;

  const change = (id: string, status: "accepted" | "declined" | "cancelled") =>
    start(async () => {
      const r = await setPlanStatus(id, status);
      if (r.ok) setList((l) => (status === "accepted" ? l.map((p) => (p.id === id ? { ...p, status } : p)) : l.filter((p) => p.id !== id)));
    });

  const day = (d: string) => {
    const date = new Date(`${d}T00:00:00`);
    const now = new Date();
    const diff = Math.round((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5);
    if (diff === 0) return L ? "Today" : "Hoy";
    if (diff === 1) return L ? "Tomorrow" : "Mañana";
    return date.toLocaleDateString(L ? "en-GB" : "es-ES", { weekday: "long" });
  };

  return (
    <section id="planes" className="scroll-mt-24 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        📅 {L ? "Your plans" : "Vuestros planes"}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((p) => {
          const mine = p.creator_id === meId;
          const confirmed = p.status === "accepted";
          return (
            <li
              key={p.id}
              className={`flex items-center gap-4 rounded-2xl p-3 ring-1 ${
                confirmed ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900" : "bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900"
              }`}
            >
              <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-white py-2 text-center shadow-sm dark:bg-neutral-900">
                <span className="text-[10px] font-bold uppercase text-rose-500">{new Date(`${p.plan_date}T12:00:00`).toLocaleDateString(L ? "en-GB" : "es-ES", { month: "short" })}</span>
                <span className="text-2xl font-black leading-none">{Number(p.plan_date.slice(8, 10))}</span>
              </div>
              <Link href={`/titulo/${p.media_type}/${p.tmdb_id}`} className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                {p.poster_path && <Image src={img(p.poster_path, "w92")!} alt="" fill sizes="44px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.title}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {day(p.plan_date)} ·{" "}
                  {confirmed ? (L ? "✅ Confirmed" : "✅ Confirmado") : mine ? (L ? `Waiting for ${friendName}` : `Esperando a ${friendName}`) : L ? `${friendName} invites you` : `${friendName} te invita`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!confirmed && !mine && (
                    <>
                      <button type="button" disabled={pending} onClick={() => change(p.id, "accepted")} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                        {L ? "I'm in!" : "¡Me apunto!"}
                      </button>
                      <button type="button" disabled={pending} onClick={() => change(p.id, "declined")} className="rounded-full bg-white px-3 py-1 text-xs font-bold ring-1 ring-neutral-300 hover:bg-neutral-100 disabled:opacity-60 dark:bg-neutral-900 dark:ring-neutral-700">
                        {L ? "Can't make it" : "No puedo"}
                      </button>
                    </>
                  )}
                  {mine && (
                    <button type="button" disabled={pending} onClick={() => change(p.id, "cancelled")} className="text-xs font-semibold text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200">
                      {L ? "Cancel plan" : "Cancelar plan"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
