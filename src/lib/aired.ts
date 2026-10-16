// Un capítulo está "emitido" si su fecha ya pasó. Si TMDB no tiene fecha, se deja marcar.
export function isAired(ep: { air_date: string | null }): boolean {
  return !ep.air_date || ep.air_date <= new Date().toISOString().slice(0, 10);
}
