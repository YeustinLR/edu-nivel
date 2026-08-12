import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EduNivel - Plataforma Educativa Costarricense",
    template: "%s | EduNivel",
  },
  description:
    "Plataforma educativa costarricense para primaria y secundaria. Contenidos alineados al MEP.",
  openGraph: {
    title: "EduNivel",
    description:
      "Plataforma educativa costarricense para primaria y secundaria",
    locale: "es_CR",
    type: "website",
    siteName: "EduNivel",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduNivel",
    description:
      "Plataforma educativa costarricense para primaria y secundaria",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          {process.env.NODE_ENV === "production" && (
            <>
              <Analytics />
              <SpeedInsights />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
