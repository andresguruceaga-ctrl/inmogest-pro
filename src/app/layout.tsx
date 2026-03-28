import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InmoGest Pro - Administración de Propiedades en Panamá",
  description: "Plataforma completa para la gestión de propiedades, contratos, inquilinos y propietarios. Diseñada para el mercado inmobiliario de Panamá.",
  keywords: ["InmoGest", "Propiedades", "Panamá", "Administración", "Inmobiliaria", "Contratos", "Alquiler", "Bienes Raíces"],
  authors: [{ name: "InmoGest Pro Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "InmoGest Pro - Administración de Propiedades",
    description: "Plataforma completa para la gestión inmobiliaria en Panamá",
    url: "https://inmogestpro.pa",
    siteName: "InmoGest Pro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InmoGest Pro",
    description: "Plataforma completa para la gestión inmobiliaria en Panamá",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
