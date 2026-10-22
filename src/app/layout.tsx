import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { AppNavbar } from "@/components/navigation/AppNavbar";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { FloatingActionBar } from "@/components/navigation/FloatingActionBar";

export const metadata: Metadata = {
  title: "DERIV SYNTHQUANT | Señales en Índices Sintéticos 24/7",
  description:
    "Señales de trading institucionales de alta precisión en Índices Sintéticos de Deriv (Volatility, Boom, Crash, Step) con Bitácora Rápida integrada.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-rose-500 selection:text-white">
        <AuthSessionProvider>
          <SettingsProvider>
            <AppNavbar />
            <main className="mx-auto max-w-3xl px-4 py-5 pb-16">{children}</main>
            <SettingsModal />
            <FloatingActionBar />
          </SettingsProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
