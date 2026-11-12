// Errores del servidor (páginas y rutas): se guardan en el registro de Admin y se avisa al administrador
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> }
) {
  try {
    const e = err as { message?: string; stack?: string; digest?: string };
    const msg = e?.message ?? String(err);
    if (/NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR/.test(msg)) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const ua = request.headers["user-agent"];
    await fetch(`${url}/rest/v1/rpc/log_error`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_message: `[servidor] ${msg}`.slice(0, 500),
        p_stack: e?.stack?.slice(0, 4000) ?? null,
        p_path: `${request.method} ${request.path}`.slice(0, 300),
        p_digest: e?.digest ?? null,
        p_ua: (Array.isArray(ua) ? ua[0] : ua)?.slice(0, 300) ?? null,
      }),
    });
  } catch {
    // nunca romper la petición por fallar al registrar el error
  }
}
