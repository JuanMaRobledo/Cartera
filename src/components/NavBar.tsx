"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Centro financiero JMR">
          <Image src="/jmr-roble-foso.png" alt="JMR" width={40} height={40} className="h-9 w-9 object-contain" />
          <span className="hidden text-sm font-semibold text-slate-900 sm:block">Centro financiero</span>
        </Link>
        <nav className="flex shrink-0 gap-1">
          <Link href="/" className={`rounded-md px-3 py-1.5 text-sm font-medium ${pathname === "/" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            Aplicaciones
          </Link>
          {inPortfolio && portfolioLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
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
    </header>
  );
}
