import Link from "next/link";
import Image from "next/image";
import { InstallAppCard } from "@/components/InstallAppCard";

const apps = [
  {
    name: "Seguimiento de cartera",
    description: "Posiciones, rentabilidad real, efectivo, deuda y efecto cambiario en un solo panel.",
    href: "/cartera",
    action: "Abrir cartera",
    eyebrow: "Inversiones",
    accent: "from-sky-500 to-indigo-600",
    icon: "↗",
    external: false,
  },
  {
    name: "Modelo JMR",
    description: "Bitácora de valoración, visor cuantitativo, research fundamental y portafolio unificado.",
    href: "https://modelo-jmr.vercel.app",
    action: "Abrir Modelo JMR",
    eyebrow: "Valoración",
    accent: "from-indigo-500 to-violet-600",
    icon: "◇",
    external: true,
  },
  {
    name: "Presupuesto personal",
    description: "Presupuesto, cuentas, tarjetas, deudas, flujo de caja y patrimonio personal.",
    href: "https://juanmarobledo.github.io/presupuesto-app-web/",
    action: "Abrir presupuesto",
    eyebrow: "Finanzas personales",
    accent: "from-emerald-500 to-teal-600",
    icon: "$",
    external: true,
  },
] as const;

export default function AppsHomePage() {
  return (
    <div className="space-y-10 py-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Centro de aplicaciones</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Todo tu ecosistema financiero, desde un solo lugar.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Selecciona la herramienta que necesitas. Cada aplicación conserva sus propios datos y funciones.
            </p>
          </div>
          <div className="flex shrink-0 justify-center sm:justify-end">
            <Image
              src="/jmr-roble-foso.png?v=3"
              alt="JMR · El Roble en el Foso"
              width={220}
              height={220}
              priority
              className="h-44 w-44 object-contain drop-shadow-2xl sm:h-52 sm:w-52"
            />
          </div>
        </div>
      </section>

      <InstallAppCard />

      <section aria-labelledby="apps-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">Tus herramientas</p>
            <h2 id="apps-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Aplicaciones disponibles
            </h2>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">{apps.length} aplicaciones</span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {apps.map((app) => {
            const card = (
              <>
                <div className={`mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${app.accent} text-xl font-semibold text-white shadow-lg`}>
                  {app.icon}
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{app.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{app.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{app.description}</p>
                <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-slate-900">
                  <span>{app.action}</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </>
            );

            const className = "group flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2";

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
    </div>
  );
}
