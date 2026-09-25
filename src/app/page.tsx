import Image from "next/image";
import { InstallAppCard } from "@/components/InstallAppCard";

const apps = [
  {
    name: "Cartera",
    description:
      "Posiciones, rentabilidad, efectivo, deuda y efecto cambiario en una sola vista.",
    href: "/cartera",
    action: "Abrir cartera",
    category: "Inversiones",
    logo: "/app-logos/cartera.svg",
    external: false,
  },
  {
    name: "Modelo JMR",
    description:
      "Valoración empresarial, research fundamental y seguimiento disciplinado de tesis.",
    href: "/api/sso/start?app=modelo",
    action: "Abrir modelo",
    category: "Análisis",
    logo: "/app-logos/modelo-jmr.svg",
    external: false,
  },
  {
    name: "Presupuesto",
    description:
      "Cuentas, tarjetas, deudas, flujo de caja y patrimonio personal bajo control.",
    href: "/api/sso/start?app=presupuesto",
    action: "Abrir presupuesto",
    category: "Finanzas personales",
    logo: "/app-logos/presupuesto.svg",
    external: false,
  },
] as const;

export default function AppsHomePage() {
  return (
    <div className="py-5 sm:py-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#d9d4c8] bg-[#fbf8f1] px-5 py-9 shadow-[0_24px_70px_rgba(32,38,35,0.11)] sm:px-10 sm:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-[#b18a45]/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-28 h-[22rem] w-[22rem] rounded-full border border-[#b18a45]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-56 -right-44 h-[38rem] w-[38rem] rounded-full border border-[#314a35]/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(177,138,69,0.13),transparent_68%)]"
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-5 -z-10 rounded-full bg-[#314a35]/8 blur-2xl"
            />
            <Image
              src="/jmr-roble-foso-mobile.png"
              alt="JMR · El Roble en el Foso"
              width={230}
              height={230}
              priority
              className="h-44 w-44 object-contain drop-shadow-[0_12px_22px_rgba(37,60,43,0.13)] sm:h-52 sm:w-52"
            />
          </div>

          <p
            className="mt-3 bg-gradient-to-r from-[#86652f] via-[#c39a50] to-[#86652f] bg-clip-text pl-[0.34em] text-2xl font-normal tracking-[0.34em] text-transparent sm:text-3xl"
            style={{
              fontFamily:
                '"Bodoni MT", Didot, "Bodoni 72", "Cormorant Garamond", Georgia, serif',
            }}
          >
            JMR
          </p>
          <div className="mt-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#b18a45]" />
            <span className="h-1.5 w-1.5 rotate-45 border border-[#b18a45]" />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#b18a45]" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-[#202622] sm:text-5xl">
            Centro financiero
          </h1>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#7d765f] sm:text-sm">
            Comprender · Valorar · Decidir
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#697069] sm:text-base">
            Tres herramientas conectadas por una misma manera de pensar el
            patrimonio.
          </p>
        </div>

        <div className="relative mx-auto mt-12 max-w-5xl">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#dcd6ca] pb-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#9a7c46]">
                Ecosistema JMR
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#2b332e]">
                Tus aplicaciones
              </h2>
            </div>
            <span className="hidden text-xs text-[#868b86] sm:block">
              Selecciona una herramienta
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {apps.map((app) => {
              const card = (
                <>
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#314a35] via-[#b18a45] to-[#314a35] opacity-75" />
                  <div className="flex items-start justify-between gap-4">
                    <Image
                      src={app.logo}
                      alt={`Logo de ${app.name}`}
                      width={96}
                      height={96}
                      className="h-20 w-20 transition duration-300 group-hover:scale-[1.04] sm:h-24 sm:w-24"
                    />
                    <span className="rounded-full border border-[#d9d1c0] bg-[#fbf7ed] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#806d49]">
                      {app.category}
                    </span>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold tracking-tight text-[#202622]">
                      {app.name}
                    </h3>
                    <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-[#686f69]">
                      {app.description}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-[#e3ded3] pt-4 text-sm font-semibold text-[#314a35]">
                    <span>{app.action}</span>
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 place-items-center rounded-full border border-[#d8cfbd] bg-[#fffaf1] transition group-hover:border-[#b18a45] group-hover:bg-[#314a35] group-hover:text-[#fffaf1]"
                    >
                      {app.external ? "↗" : "→"}
                    </span>
                  </div>
                </>
              );

              const className =
                "group relative flex min-h-[21rem] flex-col overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[linear-gradient(145deg,#ffffff_0%,#ffffff_62%,#f8f3e9_100%)] p-6 shadow-[0_8px_24px_rgba(32,38,35,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-[#b6a27b] hover:shadow-[0_20px_42px_rgba(32,38,35,0.12)] focus:outline-none focus:ring-2 focus:ring-[#8c774f] focus:ring-offset-2";

              return <a key={app.name} href={app.href} className={className}>{card}</a>;
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 max-w-5xl">
        <InstallAppCard />
      </div>
    </div>
  );
}
