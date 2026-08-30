"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Panel" },
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
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <span className="text-lg font-semibold">Cartera</span>
        <nav className="flex flex-wrap gap-1">
          {links.map((link) => {
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
      </div>
    </header>
  );
}
