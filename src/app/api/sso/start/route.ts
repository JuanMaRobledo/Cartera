import { NextRequest, NextResponse } from "next/server";
import { issueTicket, safeReturnPath, SSO_TARGETS, type SsoApp } from "@/lib/sso";

export async function GET(request: NextRequest) {
  const app = request.nextUrl.searchParams.get("app");
  if (!app || !(app in SSO_TARGETS)) return new Response("Aplicación desconocida", { status: 400 });
  const target = SSO_TARGETS[app as SsoApp];
  const path = safeReturnPath(request.nextUrl.searchParams.get("path"));
  try {
    const code = await issueTicket(app as SsoApp, path);
    // Top-level POST keeps the short-lived code out of URLs and referrer headers.
    return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Abriendo aplicación</title><form id="transfer" method="post" action="${target}/api/sso"><input type="hidden" name="code" value="${code}"><button type="submit">Continuar</button></form><script>document.getElementById('transfer').submit()</script></html>`, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": `default-src 'none'; script-src 'unsafe-inline'; form-action ${target}; base-uri 'none'`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo abrir la aplicación. Inténtalo de nuevo." }, { status: 503 });
  }
}
