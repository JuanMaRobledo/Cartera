"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Aplicaciones" },
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

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-3">
        <span className="shrink-0 text-lg font-semibold">JMR</span>
        <nav className="flex shrink-0 gap-1">
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
