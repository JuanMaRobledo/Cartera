import Image from "next/image";
import Link from "next/link";
import { InstallAppCard } from "@/components/InstallAppCard";

const apps = [
  {
    name: "Cartera",
    description: "Posiciones, rentabilidad, efectivo, deuda y efecto cambiario.",
    href: "/cartera",
    action: "Abrir cartera",
    category: "Inversiones",
    symbol: "C",
    external: false,
  },
  {
    name: "Modelo JMR",
    description: "Valoración empresarial, research fundamental y seguimiento de tesis.",
    href: "https://modelo-jmr.vercel.app",
    action: "Abrir modelo",
    category: "Análisis",
    symbol: "V",
    external: true,
  },
  {
    name: "Presupuesto",
    description: "Cuentas, tarjetas, deudas, flujo de caja y patrimonio personal.",
    href: "https://juanmarobledo.github.io/presupuesto-app-web/",
    action: "Abrir presupuesto",
    category: "Finanzas personales",
    symbol: "$",
    external: true,
  },
] as const;

export default function AppsHomePage() {
  return (
    <div className="py-5 sm:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-[#dedbd3] bg-[#fbfaf7] px-5 py-9 shadow-[0_18px_55px_rgba(32,38,35,0.08)] sm:px-10 sm:py-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/jmr-roble-foso-mobile.png"
            alt="JMR · El Roble en el Foso"
            width={230}
            height={230}
            priority
            className="h-44 w-44 object-contain sm:h-52 sm:w-52"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#8c774f]">JMR</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#202622] sm:text-5xl">Centro financiero</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#697069] sm:text-base">
            Elige la herramienta que quieres utilizar.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {apps.map((app) => {
            const card = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#d8d4ca] bg-white text-sm font-semibold text-[#38423b]">
                    {app.symbol}
                  </span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#9b8b6b]">{app.category}</span>
                </div>
                <h2 className="mt-8 text-xl font-semibold tracking-tight text-[#202622]">{app.name}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#6b716c]">{app.description}</p>
                <div className="mt-7 flex items-center justify-between border-t border-[#e7e4dc] pt-4 text-sm font-semibold text-[#303a33]">
                  <span>{app.action}</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">{app.external ? "↗" : "→"}</span>
                </div>
              </>
            );

            const className =
              "group flex min-h-[17rem] flex-col rounded-2xl border border-[#dedbd3] bg-white p-6 shadow-[0_5px_18px_rgba(32,38,35,0.04)] transition hover:-translate-y-1 hover:border-[#a99670] hover:shadow-[0_16px_35px_rgba(32,38,35,0.09)] focus:outline-none focus:ring-2 focus:ring-[#8c774f] focus:ring-offset-2";

            return app.external ? (
              <a key={app.name} href={app.href} target="_blank" rel="noreferrer" className={className}>
                {card}
              </a>
            ) : (
              <Link key={app.name} href={app.href} className={className}>
                {card}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mx-auto mt-6 max-w-5xl">
        <InstallAppCard />
      </div>
    </div>
  );
}
