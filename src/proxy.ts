import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Gatekeeper único: sin APP_PASSWORD configurada la app queda abierta para
 * desarrollo local. En producción, APP_USERNAME (o juan0804 por defecto)
 * y APP_PASSWORD protegen toda la app. /api/cron queda afuera porque esa ruta
 * valida su propio CRON_SECRET (Vercel la llama sin la cookie de sesión).
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSession(token)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/login|api/cron|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|jmr-roble-foso-mobile.png).*)",
  ],
};
