import { redirect } from "next/navigation";

// /u/usuario/resumen → resumen del año en curso
export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  redirect(`/u/${encodeURIComponent(decodeURIComponent(username).toLowerCase())}/resumen/${new Date().getUTCFullYear()}`);
}
