import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniAI Studio — Cliente IA BYOK, Local-First",
  description:
    "Cliente web de IA Bring Your Own Key: OpenAI, Anthropic, Google Gemini y Ollama, con skills (búsqueda web, imágenes), servidores MCP, personas, cuentas con sincronización opcional y una personalización total. Tus claves se cifran y se guardan solo en tu navegador. Open Source (MIT).",
  keywords: [
    "OmniAI Studio",
    "BYOK",
    "Local-First",
    "AI chat",
    "OpenAI",
    "Anthropic",
    "Gemini",
    "Ollama",
    "MCP",
    "Skills",
    "Vercel AI SDK",
  ],
  authors: [{ name: "OmniAI Studio Contributors" }],
  openGraph: {
    title: "OmniAI Studio",
    description:
      "Cliente IA multi-modelo BYOK · Local-First · Skills · MCP · Open Source (MIT)",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
