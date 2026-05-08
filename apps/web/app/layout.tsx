import type { Metadata, Viewport } from "next";
import { Exo_2 } from "next/font/google";
import { Header } from "@/components/Header";
import { RegistrarSW } from "@/components/RegistrarSW";
import "./globals.css";

const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-title",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NTANK — Calculadora de Tanques | NTN Engenharia",
    template: "%s · NTANK",
  },
  description:
    "Dimensionamento de tanques verticais cilíndricos segundo API 650 e NBR 7821.",
  applicationName: "NTANK",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NTANK",
    statusBarStyle: "black-translucent",
    startupImage: ["/icons/icon-512.png"],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "NTANK",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ADD91C" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={exo2.variable}>
      <body className="min-h-screen bg-creme text-carbono">
        <RegistrarSW />
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-safe sm:py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-6 pb-safe text-xs text-carbono-500">
          Powered by{" "}
          <a
            href="https://www.ntnengenharia.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-carbono hover:underline"
          >
            NTN ENGENHARIA
          </a>{" "}
          · Dados deste navegador (não saem do dispositivo).
        </footer>
      </body>
    </html>
  );
}
