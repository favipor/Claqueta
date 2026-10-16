"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setPrivacy, updateProfile } from "@/app/profile-actions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

// Recorta la imagen a un cuadrado de 256 px y la comprime (así pesa muy poco)
async function toSquareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, 256, 256);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85)
  );
}

export function SettingsForm({
  userId,
  username,
  initial,
  cooldownUntil,
}: {
  userId: string;
  username: string;
  initial: {
    display_name: string;
    bio: string;
    avatar_url: string | null;
    is_private: boolean;
  };
  cooldownUntil: string | null;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar_url);
  const [isPrivate, setIsPrivate] = useState(initial.is_private);
  const [until, setUntil] = useState<string | null>(cooldownUntil);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", {
      day: "numeric",
      month: "long",
    });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMsg({ text: t("set.photoInvalid"), error: true });
      return;
    }
    setBusy(true);
    try {
      const blob = await toSquareJpeg(file);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const res = await updateProfile({ avatarUrl: url });
      if (!res.ok) throw new Error("save");
      setAvatar(url);
      setMsg({ text: t("set.saved"), error: false });
      router.refresh();
    } catch {
      setMsg({ text: t("set.error"), error: true });
    }
    setBusy(false);
  }

  async function removePhoto() {
    setBusy(true);
    setMsg(null);
    const res = await updateProfile({ avatarUrl: null });
    if (res.ok) {
      setAvatar(null);
      createClient().storage.from("avatars").remove([`${userId}/avatar.jpg`]).catch(() => {});
      router.refresh();
    } else setMsg({ text: t("set.error"), error: true });
    setBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await updateProfile({ displayName, bio });
    setMsg(res.ok ? { text: `✓ ${t("set.saved")}`, error: false } : { text: t("set.error"), error: true });
    if (res.ok) router.refresh();
    setBusy(false);
  }

  async function togglePrivacy() {
    setBusy(true);
    setMsg(null);
    const next = !isPrivate;
    const res = await setPrivacy(next);
    if (res.ok) {
      setIsPrivate(next);
      setUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
      setMsg({ text: `✓ ${t("set.saved")}`, error: false });
      router.refresh();
    } else if (res.error === "cooldown") {
      setMsg({ text: t("set.privacyCooldownError"), error: true });
    } else {
      setMsg({ text: t("set.error"), error: true });
    }
    setBusy(false);
  }

  const input =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950";
  const card =
    "space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
  const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-neutral-500";
  const locked = !!until && new Date(until).getTime() > Date.now();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-extrabold">{t("set.title")}</h1>

      <section className={card}>
        <h2 className={sectionTitle}>{t("set.photo")}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar url={avatar} size={88} />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {t("set.changePhoto")}
              </button>
              {avatar && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={removePhoto}
                  className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {t("set.removePhoto")}
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-500">{t("set.photoHint")}</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFile}
            className="sr-only"
            tabIndex={-1}
            aria-label={t("set.changePhoto")}
          />
        </div>
      </section>

      <form onSubmit={save} className={card}>
        <h2 className={sectionTitle}>{t("set.profile")}</h2>

        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium">
            {t("set.username")}
          </label>
          <input id="username" value={`@${username}`} readOnly disabled className={`${input} opacity-70`} />
          <p className="mt-1 text-xs text-neutral-500">{t("set.usernameLocked")}</p>
        </div>

        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
            {t("onb.displayName")}
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium">
            {t("set.bio")}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className={input}
          />
          <p className="mt-1 text-right text-xs text-neutral-500">{bio.length}/160</p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {t("detail.save")}
        </button>
      </form>

      <section className={card}>
        <h2 className={sectionTitle}>{t("set.privacyTitle")}</h2>
        <p className="text-sm">
          {isPrivate ? `🔒 ${t("onb.private")}` : `🌍 ${t("onb.public")}`}
          <span className="block text-xs text-neutral-500">
            {isPrivate ? t("onb.privateDesc") : t("onb.publicDesc")}
          </span>
        </p>
        <button
          type="button"
          disabled={busy || locked}
          onClick={togglePrivacy}
          className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {isPrivate ? t("set.makePublic") : t("set.makePrivate")}
        </button>
        <p className="text-xs text-neutral-500">
          {locked && until ? `${t("set.cooldown")} ${fmtDate(until)}. ` : ""}
          {t("onb.privacyNote")}
        </p>
      </section>

      {msg && (
        <p
          role="status"
          className={`text-sm ${msg.error ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
