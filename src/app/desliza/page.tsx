import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { SwipeDeck } from "@/components/SwipeDeck";

export const metadata = { title: "Desliza", robots: { index: false } };

// «Desliza»: marca títulos pasando carátulas, sin límite. Las carátulas se piden desde el cliente,
// así que al guardar (que refresca la página) no se vuelve a calcular nada aquí.
export default async function SwipePage() {
  const { lang } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const L = lang === "en";
  return (
    // Ocupa justo la pantalla (sin bajar) y queda centrado en vertical
    <div className="-mb-6 -mt-5 flex min-h-[calc(100dvh-6rem)] flex-col justify-center gap-2 sm:-my-4 sm:min-h-[calc(100dvh-8.5rem)] sm:gap-3">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{L ? "Swipe" : "Desliza"}</h1>
        <p className="mx-auto hidden max-w-md text-xs text-neutral-500 sm:block [@media(max-height:720px)]:hidden">
          {L ? "Mark what you've seen, what you're watching and what you want to watch. Stop whenever you like." : "Marca lo que has visto, lo que estás viendo y lo que quieres ver. Paras cuando quieras."}
        </p>
      </div>
      <SwipeDeck />
    </div>
  );
}
