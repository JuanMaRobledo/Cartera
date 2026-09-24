import type { Metadata, Viewport } from "next";
import { NavBar } from "@/components/NavBar";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "JMR · Centro financiero",
  description: "Presupuesto, cartera y valoración empresarial en un solo ecosistema financiero",
  applicationName: "JMR",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JMR",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#314a35",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PwaRegistration />
        <NavBar />
        <main id="main-content" className="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-4 pb-24 pt-4 text-[0.68rem] uppercase tracking-[0.12em] text-[#887a64] md:pb-8">
          <span>JMR · Centro financiero</span>
          <span>Disciplina · Claridad · Perspectiva</span>
        </footer>
      </body>
    </html>
  );
}
