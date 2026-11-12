"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/I18nProvider";
import { ClapperIcon } from "@/components/ClapperIcon";
import { PasswordField } from "@/components/PasswordField";
import type { DictKey } from "@/lib/dict";

// Se llega desde el correo de «recuperar contraseña» (?token_hash=…&type=recovery).
// El enlace funciona aunque se abra en otro dispositivo distinto del que lo pidió.
export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [stage, setStage] = useState<"checking" | "form" | "expired" | "done">("checking");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    (async () => {
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        // Se limpia la dirección para que el enlace (de un solo uso) no quede en el historial
        window.history.replaceState(null, "", "/restablecer");
        if (!error) return setStage("form");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setStage(user ? "form" : "expired");
    })();
  }, []);

  const mismatch = password2.length > 0 && password2 !== password;
  const canSave = !busy && password.length >= 6 && password === password2;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.code === "same_password" ? "auth.weak" : error.code === "weak_password" ? "auth.weak" : "auth.generic");
      return;
    }
    setStage("done");
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 1800);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl shadow-black/5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xl font-extrabold text-brand-fg">
        <ClapperIcon className="h-7 w-7" />
        Claqueta
      </Link>

      {stage === "checking" && (
        <div className="flex justify-center py-16" aria-busy="true">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand dark:border-neutral-700" />
        </div>
      )}

      {stage === "expired" && (
        <div className="space-y-4" role="alert">
          <h1 className="text-2xl font-extrabold">{t("auth.forgotTitle")}</h1>
          <p className="text-neutral-600 dark:text-neutral-300">{t("auth.linkExpired")}</p>
          <Link href="/login" className="inline-block rounded-xl bg-brand px-5 py-3 font-bold text-white hover:bg-brand-dark">
            {t("auth.requestNew")}
          </Link>
        </div>
      )}

      {stage === "done" && (
        <div className="py-8 text-center" role="status">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-3xl dark:bg-emerald-950/50">✓</div>
          <p className="mt-4 text-lg font-bold">{t("auth.saved")}</p>
        </div>
      )}

      {stage === "form" && (
        <form onSubmit={save} className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold">{t("auth.newTitle")}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("auth.newSub")}</p>
          </div>
          <PasswordField id="password" label={t("auth.newPassword")} value={password} onChange={setPassword} autoComplete="new-password" strength />
          <PasswordField
            id="password2"
            label={t("login.password2")}
            value={password2}
            onChange={setPassword2}
            autoComplete="new-password"
            state={password2 ? (mismatch ? "bad" : "ok") : undefined}
            hint={password2 ? (mismatch ? t("login.mismatch") : `✓ ${t("login.match")}`) : undefined}
          />
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              ⚠️ {t(error)}
            </p>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {t("auth.save")}
          </button>
        </form>
      )}
    </div>
  );
}
