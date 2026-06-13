import type { Metadata } from "next";
import { Inter, Share_Tech_Mono, VT323 } from "next/font/google";
import "@/styles/tailwind-prelude.css";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme-context";
import { DEFAULT_THEME, THEME_INIT_SCRIPT, themeClass } from "@/lib/theme";

// Fuentes para los distintos temas: Inter (clásico/noche), mono de terminal
// y VT323 CRT (matrix/ámbar). Cada tema elige cuál usa vía sus variables CSS.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-stm",
  subsets: ["latin"],
});
const vt323 = VT323({
  weight: "400",
  variable: "--font-vt323",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  if (locale === "en") {
    return {
      title: "Matrix — Personal agents control center",
      description:
        "One control center for all your agents and daily apps: finance, immigration, documents, chat.",
    };
  }
  return {
    title: "Matrix — Centro de control de agentes",
    description:
      "Un único centro de control para todos tus agentes y apps del día a día: finanzas, inmigración, documentos, chat.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const htmlLang = locale === "en" ? "en" : "es";
  const fontVars = `${inter.variable} ${mono.variable} ${vt323.variable}`;
  return (
    <html
      lang={htmlLang}
      className={`${fontVars} ${themeClass(DEFAULT_THEME)} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          <I18nProvider initialLocale={locale}>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
