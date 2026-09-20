"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const portfolioLinks = [
  { href: "/cartera", label: "Panel" },
  { href: "/transacciones", label: "Transacciones" },
  { href: "/importar", label: "Importar" },
  { href: "/activos", label: "Activos" },
  { href: "/tipos-de-cambio", label: "Tipos de cambio" },
  { href: "/monedas", label: "Monedas" },
  { href: "/cuentas", label: "Cuentas" },
  { href: "/config", label: "Configuración" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  const inPortfolio = pathname === "/cartera" || pathname.startsWith("/cartera/") || pathname.startsWith("/transacciones") || pathname.startsWith("/importar") || pathname.startsWith("/activos") || pathname.startsWith("/tipos-de-cambio") || pathname.startsWith("/monedas") || pathname.startsWith("/cuentas") || pathname.startsWith("/config");

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Centro financiero JMR">
          <Image src="/jmr-roble-foso-mobile.png" alt="JMR" width={40} height={40} className="h-9 w-9 object-contain" />
          <span className="hidden text-sm font-semibold text-slate-900 sm:block">Centro financiero</span>
        </Link>
        <nav aria-label="Navegación principal" className="flex min-w-0 shrink-0 gap-1">
          <Link href="/" className={`rounded-md px-3 py-1.5 text-sm font-medium ${pathname === "/" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            Aplicaciones
          </Link>
          {inPortfolio && portfolioLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="ml-auto shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Cerrar sesión
        </button>
      </div>
      {inPortfolio && (
        <nav aria-label="Navegación rápida móvil" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 p-2 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          {portfolioLinks.filter((link) => ["/cartera", "/transacciones", "/importar", "/config"].includes(link.href)).map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${pathname === link.href ? "bg-slate-900 text-white" : "text-slate-600"}`}>
              {link.label === "Configuración" ? "Config." : link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
