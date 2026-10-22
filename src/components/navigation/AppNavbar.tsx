"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { DerivConnectionModal } from "@/components/navigation/DerivConnectionModal";
import { useAppSettings } from "@/components/providers/SettingsProvider";
import { SlidersHorizontal, LogOut } from "lucide-react";

export function AppNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openSettings } = useAppSettings();

  if (!session?.user || pathname === "/login" || pathname === "/register") {
    return null;
  }

  const isAdmin = session.user.role === "ADMIN";

  const navItems = [
    { href: "/feed", label: "Señales", badge: "LIVE" },
    { href: "/strategies", label: "Estrategias" },
    { href: "/journal", label: "Bitácora" },
    ...(isAdmin
      ? [
          { href: "/admin/users", label: "Usuarios (Admin)" },
          { href: "/admin/strategies", label: "Motor (Admin)" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="theme-accent-btn flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black text-white">
            DQ
          </span>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-zinc-100">
              SYNTHQUANT
            </span>
            <span className="theme-accent-subtle ml-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold border">
              DERIV 24/7
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <DerivConnectionModal />
          <div className="hidden text-right md:block">
            <p className="text-xs font-semibold text-zinc-200">
              {session.user.name}
            </p>
            <p className="theme-accent-text font-mono text-[10px]">
              {session.user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Navegación Mobile-First */}
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2.5 no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "theme-accent-btn text-white"
                  : "bg-zinc-900/70 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`rounded px-1 py-0.2 text-[9px] font-extrabold ${
                    isActive
                      ? "bg-black/25 text-white"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
