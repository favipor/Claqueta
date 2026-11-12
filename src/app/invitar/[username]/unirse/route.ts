import { NextResponse } from "next/server";

// «Únete»: recuerda quién te invitó (30 días) y lleva a crear la cuenta.
// Al elegir tu @usuario empezarás siguiendo a esa persona.
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const res = NextResponse.redirect(new URL("/login", request.url));
  if (/^[a-z0-9_]{3,20}$/.test(username)) {
    res.cookies.set("claq_ref", username, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  }
  return res;
}
