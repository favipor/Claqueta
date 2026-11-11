// Límite de peticiones por IP en memoria (por instancia del servidor). No es infalible,
// pero frena a quien intente agotar el cupo de TMDB llamando a la API en bucle.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }
    return true;
  }
  h.count++;
  return h.count <= max;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon"
  );
}
