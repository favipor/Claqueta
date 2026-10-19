export const SORTS = ["reciente", "nota_alta", "nota_baja", "titulo", "duracion"] as const;
export type Sort = (typeof SORTS)[number];
