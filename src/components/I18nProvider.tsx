"use client";

import { createContext, useContext, type ReactNode } from "react";
import { dictionaries, type DictKey, type Lang } from "@/lib/dict";

const Ctx = createContext<Lang>("es");

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const lang = useContext(Ctx);
  const dict = dictionaries[lang];
  return { lang, t: (key: DictKey) => dict[key] };
}
