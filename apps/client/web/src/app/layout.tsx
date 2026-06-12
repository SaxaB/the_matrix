import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/tailwind-prelude.css";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  if (locale === "en") {
    return {
      title: "Matrix — Portfolio Analyzer & AI insights",
      description:
        "Align your portfolio with your risk profile using data-driven insights and personalized rebalancing context.",
    };
  }
  return {
    title: "Matrix — Analizador de Portafolio & Asesor IA",
    description:
      "Alinea tu portafolio con tu perfil de riesgo usando inteligencia artificial. Obtén recomendaciones personalizadas de rebalanceo.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const htmlLang = locale === "en" ? "en" : "es";
  return (
    <html lang={htmlLang} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
