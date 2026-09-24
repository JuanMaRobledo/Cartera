import Image from "next/image";
import Link from "next/link";
import { InstallAppCard } from "@/components/InstallAppCard";

const apps = [
  {
    name: "Seguimiento de cartera",
    description: "Comprende cómo evolucionan tus posiciones, qué aporta cada activo y cómo influye el tipo de cambio.",
    href: "/cartera",
    action: "Entrar a la cartera",
    eyebrow: "Inversiones",
    icon: "01",
    external: false,
    featured: true,
  },
  {
    name: "Modelo JMR",
    description: "Analiza negocios, registra tus tesis de inversión y reúne el research fundamental.",
    href: "https://modelo-jmr.vercel.app",
    action: "Abrir Modelo JMR",
    eyebrow: "Valoración",
    icon: "02",
    external: true,
    featured: false,
  },
  {
    name: "Presupuesto personal",
    description: "Organiza cuentas, tarjetas, deudas, flujo de caja y patrimonio personal.",
    href: "https://juanmarobledo.github.io/presupuesto-app-web/",
    action: "Abrir presupuesto",
    eyebrow: "Finanzas personales",
    icon: "03",
    external: true,
    featured: false,
  },
] as const;

export default function AppsHomePage() {
  const featured = apps[0];
  const secondary = apps.slice(1);

  return (
    <div className="space-y-8 py-4 sm:py-8">
      <section className="jmr-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="jmr-eyebrow">JMR · Centro financiero personal</p>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-[#f7efe2] sm:text-6xl">
            Conocer bien cada número cambia la forma de decidir.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#d9dfd6] sm:text-lg">
            Un espacio sereno para ordenar tus finanzas, seguir tu patrimonio y comprender el valor de las empresas.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/cartera" className="jmr-hero-action">
              Ver mi cartera <span aria-hidden="true">→</span>
            </Link>
            <span className="text-xs uppercase tracking-[0.16em] text-[#aebbae]">Disciplina · Claridad · Perspectiva</span>
          </div>
        </div>
        <div className="relative z-10 hidden shrink-0 flex-col items-center lg:flex">
          <div className="grid h-48 w-48 place-items-center rounded-full border border-[#d7b870]/60 bg-[#203729] shadow-[0_0_0_18px_rgba(215,184,112,0.06)]">
            <Image
              src="/jmr-roble-foso-mobile.png"
              alt="JMR · El Roble en el Foso"
              width={176}
              height={176}
              priority
              className="h-40 w-40 object-contain drop-shadow-2xl"
            />
          </div>
          <p className="mt-5 font-serif text-sm italic text-[#d7b870]">El Roble en el Foso</p>
        </div>
      </section>

      <InstallAppCard />

      <section aria-labelledby="apps-title">
        <div className="mb-5 flex items-end gap-5">
          <div>
            <p className="jmr-eyebrow text-[#9a7437]">Tu espacio</p>
            <h2 id="apps-title" className="mt-1 font-serif text-3xl font-medium tracking-tight text-[#2f4934]">
              ¿Qué quieres revisar hoy?
            </h2>
          </div>
          <span className="mb-2 hidden h-px flex-1 bg-[#d8c7ad] sm:block" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {featured && (
            <Link href={featured.href} className="jmr-feature-card group">
              <span className="jmr-card-number">{featured.icon}</span>
              <div className="relative z-10 mt-auto">
                <p className="jmr-eyebrow text-[#d7b870]">{featured.eyebrow}</p>
                <h3 className="mt-3 font-serif text-3xl font-medium text-[#fffaf1]">{featured.name}</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#ced7cd]">{featured.description}</p>
                <div className="mt-7 flex items-center justify-between border-t border-white/15 pt-4 text-sm font-semibold text-[#e6cf99]">
                  <span>{featured.action}</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          )}

          <div className="grid gap-5">
            {secondary.map((app) => {
              const content = (
                <>
                  <span className="jmr-small-number">{app.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="jmr-eyebrow text-[#9a7437]">{app.eyebrow}</p>
                    <h3 className="mt-2 font-serif text-2xl font-medium text-[#2f4934]">{app.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#746b5c]">{app.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6d5227]">
                      {app.action} <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </>
              );
              const className = "jmr-secondary-card group";

              return app.external ? (
                <a key={app.name} href={app.href} target="_blank" rel="noreferrer" className={className}>
                  {content}
                </a>
              ) : (
                <Link key={app.name} href={app.href} className={className}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
