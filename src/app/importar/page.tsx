import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "@/components/ImportWizard";

export const metadata = { title: "Claqueta" };
// Importar muchos títulos tarda: se permite hasta 60 s por paso (en Vercel)
export const maxDuration = 60;

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ImportWizard />;
}
