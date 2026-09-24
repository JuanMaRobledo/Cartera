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

  const navClass = (active: boolean) =>
    `whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-[#314a35] text-[#fffaf1] shadow-sm"
        : "text-[#6f6657] hover:bg-[#eadcc5]/70 hover:text-[#314a35]"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-[#d8c7ad] bg-[#fbf5eb]/95 shadow-[0_4px_20px_rgba(67,61,45,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Centro financiero JMR">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#314a35] ring-1 ring-[#b18a45]/60">
            <Image src="/jmr-roble-foso-mobile.png" alt="JMR" width={42} height={42} className="h-10 w-10 object-contain" />
          </span>
          <span className="hidden sm:block">
            <strong className="block font-serif text-sm font-semibold text-[#314a35]">JMR · Centro financiero</strong>
            <small className="block font-serif text-[0.68rem] italic text-[#826f52]">El Roble en el Foso</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="flex min-w-0 shrink-0 gap-1">
          <Link href="/" className={navClass(pathname === "/")}>
            Aplicaciones
          </Link>
          {inPortfolio && portfolioLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navClass(pathname === link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="ml-auto shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-[#7d725f] transition hover:bg-[#eadcc5]/70 hover:text-[#314a35]"
        >
          Cerrar sesión
        </button>
      </div>
      {inPortfolio && (
        <nav aria-label="Navegación rápida móvil" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#d8c7ad] bg-[#fbf5eb]/95 p-2 shadow-[0_-4px_18px_rgba(67,61,45,0.1)] backdrop-blur md:hidden">
          {portfolioLinks.filter((link) => ["/cartera", "/transacciones", "/importar", "/config"].includes(link.href)).map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-xl px-2 py-2 text-center text-xs font-medium ${pathname === link.href ? "bg-[#314a35] text-[#fffaf1]" : "text-[#6f6657]"}`}>
              {link.label === "Configuración" ? "Config." : link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
