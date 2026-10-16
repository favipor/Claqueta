import { cookies } from "next/headers";
import { dictionaries, type DictKey, type Lang } from "./dict";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get("lang")?.value === "en" ? "en" : "es";
}

export async function getT() {
  const lang = await getLang();
  const dict = dictionaries[lang];
  return { lang, t: (key: DictKey) => dict[key] };
}
