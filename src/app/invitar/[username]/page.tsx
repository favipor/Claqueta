import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";
import { ClapperIcon } from "@/components/ClapperIcon";
import { ShareButton } from "@/components/ShareButton";

type Props = { params: Promise<{ username: string }> };
const clean = (raw: string) => decodeURIComponent(raw).toLowerCase();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = clean((await params).username);
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("display_name, avatar_url").eq("username", username).maybeSingle();
  const name = p?.display_name ?? `@${username}`;
  const title = `${name} te invita a Claqueta`;
  const description = "Lleva el seguimiento de las pelis y series que ves, puntúalas y compártelas con tus amigos.";
  return {
    title,
    description,
    openGraph: { title, description, ...(p?.avatar_url ? { images: [{ url: p.avatar_url as string, width: 400, height: 400 }] } : {}) },
    twitter: { card: "summary", title, description },
  };
}

// Enlace de invitación: quien entra se registra y empieza siguiendo a quien le invitó
export default async function InvitePage({ params }: Props) {
  const username = clean((await params).username);
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: profile }, { data: auth }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url").eq("username", username).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!profile) notFound();
  const name = profile.display_name ?? `@${profile.username}`;
  const isMe = auth.user?.id === profile.id;

  return (
    <div className="relative left-1/2 -mt-8 flex min-h-[calc(100svh-4.5rem)] w-screen -translate-x-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-teal-950 via-teal-800 to-teal-600 px-4 py-12 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="relative w-full max-w-md rounded-[2rem] bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/15">
          <ClapperIcon className="h-9 w-9" />
        </span>
        <Avatar url={profile.avatar_url} size={72} className="mx-auto ring-4 ring-white/40" />
        {isMe ? (
          <>
            <h1 className="mt-4 text-2xl font-extrabold">{t("invite.meTitle")}</h1>
            <p className="mt-2 text-white/80">{t("invite.meText")}</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <ShareButton title={`${name} ${t("invite.shareTitle")}`} text={t("invite.shareText")} />
              <p className="break-all text-xs text-white/60">miclaqueta.com/invitar/{profile.username}</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-extrabold">
              {name} {t("invite.title")}
            </h1>
            <p className="mt-2 text-white/80">{t("invite.text")}</p>
            <ul className="mx-auto mt-5 max-w-xs space-y-1.5 text-left text-sm text-white/90">
              <li>🎬 {t("invite.p1")}</li>
              <li>⭐ {t("invite.p2")}</li>
              <li>👥 {t("invite.p3")}</li>
            </ul>
            {auth.user ? (
              <Link href={`/u/${profile.username}`} className="mt-7 inline-block rounded-full bg-white px-6 py-3 font-bold text-teal-900 shadow-lg hover:-translate-y-0.5">
                {t("invite.seeProfile")}
              </Link>
            ) : (
              <a
                href={`/invitar/${profile.username}/unirse`}
                className="mt-7 inline-block rounded-full bg-white px-6 py-3 font-bold text-teal-900 shadow-lg transition hover:-translate-y-0.5"
              >
                {t("invite.join")}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
