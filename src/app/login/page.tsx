"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import { ClapperIcon } from "@/components/ClapperIcon";
import { PasswordField, authInput } from "@/components/PasswordField";
import type { DictKey } from "@/lib/dict";

type Mode = "signin" | "signup" | "forgot";
type Sent = { kind: "signup" | "reset"; email: string } | null;

// Traduce los errores de Supabase a mensajes claros
function errorKey(e: { code?: string; message?: string; status?: number }): DictKey {
  const c = e.code ?? "";
  const m = (e.message ?? "").toLowerCase();
  if (c === "invalid_credentials" || m.includes("invalid login")) return "auth.badLogin";
  if (c === "email_not_confirmed" || m.includes("not confirmed")) return "auth.notConfirmed";
  if (c === "user_already_exists" || m.includes("already registered")) return "auth.exists";
  if (c.includes("rate_limit") || e.status === 429) return "auth.rate";
  if (c === "weak_password" || m.includes("weak")) return "auth.weak";
  return "auth.generic";
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<DictKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [sent, setSent] = useState<Sent>(null);
  const [resent, setResent] = useState(false);

  const mismatch = mode === "signup" && password2.length > 0 && password2 !== password;
  const canSubmit = !busy && (mode !== "signup" || (password.length >= 6 && password2 === password));

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setPassword2("");
  }

  // Se guarda la elección ANTES de iniciar sesión para que las cookies se creen ya con esa duración
  function applyRemember() {
    document.cookie = remember
      ? "claq_remember=; path=/; max-age=0; samesite=lax"
      : "claq_remember=0; path=/; max-age=31536000; samesite=lax";
  }

  async function google() {
    applyRemember();
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  // Tras entrar: si aún no tiene @usuario va a elegirlo; si no, a la portada
  async function afterLogin() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let dest = "/";
    if (user) {
      const { data: p } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      if (!p?.username) dest = "/bienvenida";
    }
    router.replace(dest);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/restablecer` });
      if (error && errorKey(error) === "auth.rate") setError("auth.rate");
      else setSent({ kind: "reset", email }); // no se revela si el email existe o no
    } else if (mode === "signup") {
      applyRemember();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
      if (error) setError(errorKey(error));
      // Supabase no da error si el email ya existe: devuelve un usuario sin identidades
      else if (data.user && data.user.identities?.length === 0) setError("auth.exists");
      else if (!data.session) setSent({ kind: "signup", email });
      else await afterLogin();
    } else {
      applyRemember();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(errorKey(error));
      else await afterLogin();
    }
    setBusy(false);
  }

  async function resend() {
    if (!sent) return;
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } =
      sent.kind === "signup"
        ? await supabase.auth.resend({ type: "signup", email: sent.email, options: { emailRedirectTo: `${origin}/auth/callback` } })
        : await supabase.auth.resetPasswordForEmail(sent.email, { redirectTo: `${origin}/restablecer` });
    if (error) setError(errorKey(error));
    else setResent(true);
  }

  const heading = mode === "signin" ? ["auth.welcome", "auth.welcomeSub"] : mode === "signup" ? ["auth.join", "auth.joinSub"] : ["auth.forgotTitle", "auth.forgotSub"];

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl shadow-black/5 dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-[1fr_1.1fr]">
      {/* Panel de bienvenida (solo en pantallas anchas) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-600 via-teal-800 to-neutral-950 p-10 text-white md:flex md:flex-col md:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" aria-hidden="true" />
        <Link href="/" className="relative inline-flex items-center gap-2.5 text-2xl font-extrabold">
          <ClapperIcon className="h-8 w-8 text-teal-200" />
          Claqueta
        </Link>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-extrabold leading-tight">{t("auth.panelTitle")}</h2>
          <ul className="space-y-3.5 text-teal-50">
            {(["auth.panel1", "auth.panel2", "auth.panel3"] as const).map((k, i) => (
              <li key={k} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-lg ring-1 ring-white/25" aria-hidden="true">
                  {["⭐", "📺", "👥"][i]}
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-teal-100/80">{t("app.tagline")}</p>
      </aside>

      <div className="p-6 sm:p-10">
        {sent ? (
          // ---- Correo enviado ----
          <div className="flex min-h-[26rem] flex-col items-center justify-center text-center" role="status">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-brand-fg dark:bg-teal-950/50">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">{t("auth.checkTitle")}</h1>
            <p className="mt-2 max-w-sm text-neutral-600 dark:text-neutral-300">
              {t(sent.kind === "signup" ? "auth.checkSignup" : "auth.checkReset")
                .split("{email}")
                .flatMap((part, i) => (i ? [<b key={i} className="text-neutral-900 dark:text-white">{sent.email}</b>, part] : [part]))}
            </p>
            <p className="mt-3 text-sm text-neutral-500">{t("auth.spam")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={resend}
                disabled={resent}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {resent ? `✓ ${t("auth.resent")}` : t("auth.resend")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSent(null);
                  setResent(false);
                  go("signin");
                }}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {t("auth.back")}
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
          </div>
        ) : (
          <>
            <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xl font-extrabold text-brand-fg md:hidden">
              <ClapperIcon className="h-7 w-7" />
              Claqueta
            </Link>

            {mode !== "forgot" && (
              <div role="tablist" aria-label={t("login.title")} className="mb-6 grid grid-cols-2 rounded-xl bg-neutral-100 p-1 text-sm font-semibold dark:bg-neutral-800">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => go(m)}
                    className={`rounded-lg py-2 transition ${mode === m ? "bg-brand text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}
                  >
                    {t(m === "signin" ? "login.signin" : "login.signup")}
                  </button>
                ))}
              </div>
            )}

            <h1 className="text-2xl font-extrabold">{t(heading[0] as DictKey)}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t(heading[1] as DictKey)}</p>

            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={google}
                  className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-neutral-50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:border-neutral-700"
                >
                  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7.3 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
                    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.9 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  {t("login.google")}
                </button>
                <div className="my-5 flex items-center gap-3 text-xs font-medium text-neutral-500">
                  <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  {t("login.or")}
                  <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </>
            )}

            <form onSubmit={submit} className={`space-y-4 ${mode === "forgot" ? "mt-6" : ""}`} noValidate={false}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                  {t("login.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authInput}
                />
              </div>

              {mode !== "forgot" && (
                <PasswordField
                  id="password"
                  label={t("login.password")}
                  value={password}
                  onChange={setPassword}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  strength={mode === "signup"}
                  aside={
                    mode === "signin" && (
                      <button type="button" onClick={() => go("forgot")} className="text-xs font-semibold text-brand-fg hover:underline">
                        {t("auth.forgot")}
                      </button>
                    )
                  }
                />
              )}

              {mode === "signup" && (
                <PasswordField
                  id="password2"
                  label={t("login.password2")}
                  value={password2}
                  onChange={setPassword2}
                  autoComplete="new-password"
                  state={password2 ? (mismatch ? "bad" : "ok") : undefined}
                  hint={password2 ? (mismatch ? t("login.mismatch") : `✓ ${t("login.match")}`) : undefined}
                />
              )}

              {mode !== "forgot" && (
                <label className="flex cursor-pointer select-none items-center gap-3 text-sm">
                  <input type="checkbox" role="switch" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
                  <span
                    aria-hidden="true"
                    className="relative h-5 w-9 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand-fg dark:bg-neutral-700 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
                  />
                  <span>
                    <span className="font-medium">{t("login.remember")}</span>
                    <span className="block text-xs text-neutral-500">{t("login.rememberHint")}</span>
                  </span>
                </label>
              )}

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  <span aria-hidden="true">⚠️</span>
                  <span>
                    {t(error)}
                    {error === "auth.exists" && (
                      <>
                        {" "}
                        <button type="button" onClick={() => go("forgot")} className="font-semibold underline">
                          {t("auth.forgot")}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-bold text-white shadow-sm transition hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
                {t(mode === "signin" ? "login.signin" : mode === "signup" ? "login.signup" : "auth.sendLink")}
              </button>

              {mode === "signup" && (
                <p className="text-center text-xs leading-relaxed text-neutral-500">
                  {t("auth.terms")
                    .split(/(\{a\}|\{b\})/)
                    .map((part, i) =>
                      part === "{a}" ? (
                        <Link key={i} href="/aviso-legal" className="underline hover:text-neutral-800 dark:hover:text-neutral-200">
                          {t("auth.termsA")}
                        </Link>
                      ) : part === "{b}" ? (
                        <Link key={i} href="/privacidad" className="underline hover:text-neutral-800 dark:hover:text-neutral-200">
                          {t("auth.termsB")}
                        </Link>
                      ) : (
                        part
                      )
                    )}
                </p>
              )}
            </form>

            {mode === "forgot" && (
              <button type="button" onClick={() => go("signin")} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-fg hover:underline">
                ← {t("auth.back")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
