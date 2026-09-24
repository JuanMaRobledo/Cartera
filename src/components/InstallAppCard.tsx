"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
      setIsStandalone(standalone);
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    });

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isStandalone) return null;

  const installApp = async () => {
    if (!installPrompt) {
      setShowHelp((current) => !current);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <section className="rounded-2xl border border-[#d8c7ad] bg-[#fffaf1]/85 p-5 shadow-[0_6px_22px_rgba(67,61,45,0.06)] sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="jmr-eyebrow text-[#9a7437]">Aplicación instalable</p>
        <h2 className="mt-1 font-serif text-xl font-medium text-[#2f4934]">Lleva JMR contigo</h2>
        <p className="mt-1 text-sm leading-6 text-[#746b5c]">
          Instálala en el celular o computador para abrirla como una aplicación independiente, con el mismo acceso protegido.
        </p>
        {showHelp && (
          <p className="mt-3 rounded-xl border border-[#e1d2bc] bg-[#f7efe2] px-4 py-3 text-sm leading-6 text-[#625947]">
            {isIOS
              ? "En Safari, toca Compartir y luego “Añadir a pantalla de inicio”."
              : "En Chrome, abre el menú del navegador y selecciona “Instalar aplicación” o “Añadir a pantalla principal”."}
          </p>
        )}
      </div>
      <button type="button" className="btn mt-4 w-full shrink-0 sm:mt-0 sm:w-auto" onClick={installApp}>
        {installPrompt ? "Instalar app" : showHelp ? "Ocultar instrucciones" : "Cómo instalar"}
      </button>
    </section>
  );
}
