"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkUsername, completeOnboarding } from "@/app/profile-actions";
import { useI18n } from "./I18nProvider";

type Check = "idle" | "checking" | "ok" | "invalid" | "reserved" | "taken";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(defaultName);
  const [isPrivate, setIsPrivate] = useState(false);
  const [check, setCheck] = useState<Check>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprueba si el usuario está libre, un momento después de dejar de escribir
  useEffect(() => {
    if (username === "") {
      setCheck("idle");
      return;
    }
    setCheck("checking");
    let cancelled = false;
    const id = setTimeout(async () => {
      const res = await checkUsername(username).catch(() => "invalid" as const);
      if (!cancelled) setCheck(res);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [username]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (check !== "ok") return;
    setBusy(true);
    setError(null);
    const res = await completeOnboarding({ username, displayName, isPrivate });
    if (res.ok && res.username) {
      router.push(`/u/${res.username}`);
      router.refresh();
      return;
    }
    if (res.error === "taken") setCheck("taken");
    else setError(t("onb.error"));
    setBusy(false);
  }

  const message: Record<Check, string> = {
    idle: "",
    checking: t("onb.checking"),
    ok: t("onb.available"),
    invalid: t("onb.invalid"),
    reserved: t("onb.reserved"),
    taken: t("onb.taken"),
  };

  const input =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950";

  const option = (active: boolean) =>
    `flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-brand-fg ${
      active
        ? "border-brand bg-brand/10 ring-1 ring-brand"
        : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    }`;

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-md space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">{t("onb.title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("onb.sub")}</p>
      </div>

      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium">
          {t("onb.username")}
        </label>
        <div className="flex items-center rounded-lg border border-neutral-300 bg-white focus-within:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950">
          <span className="pl-3 text-neutral-500" aria-hidden="true">
            @
          </span>
          <input
            id="username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
            }
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            required
            aria-describedby="username-hint username-status"
            className="w-full bg-transparent px-2 py-2 outline-none"
          />
        </div>
        <p id="username-hint" className="mt-1 text-xs text-neutral-500">
          {t("onb.usernameHint")}
        </p>
        <p
          id="username-status"
          role="status"
          className={`mt-1 min-h-5 text-sm ${
            check === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : check === "checking" || check === "idle"
                ? "text-neutral-500"
                : "text-red-600 dark:text-red-400"
          }`}
        >
          {check === "ok" && "✓ "}
          {message[check]}
        </p>
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

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("onb.privacy")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={option(!isPrivate)}>
            <span className="flex items-center gap-2 font-semibold">
              <input
                type="radio"
                name="privacy"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                className="accent-teal-600"
              />
              {t("onb.public")}
            </span>
            <span className="text-xs text-neutral-500">{t("onb.publicDesc")}</span>
          </label>
          <label className={option(isPrivate)}>
            <span className="flex items-center gap-2 font-semibold">
              <input
                type="radio"
                name="privacy"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
                className="accent-teal-600"
              />
              {t("onb.private")}
            </span>
            <span className="text-xs text-neutral-500">{t("onb.privateDesc")}</span>
          </label>
        </div>
        <p className="mt-2 text-xs text-neutral-500">{t("onb.privacyNote")}</p>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || check !== "ok"}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {t("onb.submit")}
      </button>
    </form>
  );
}
