"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Rol } from "@prisma/client";
import {
  ArrowLeftRight,
  BarChart3,
  KeyRound,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

const items: { href: string; label: string; icon: typeof Package; roles: Rol[] }[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["ADMIN", "ENCARGADO", "CAJERO"] },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart, roles: ["ADMIN", "ENCARGADO", "CAJERO"] },
  { href: "/inventario", label: "Inventario", icon: Package, roles: ["ADMIN", "ENCARGADO", "CAJERO"] },
  { href: "/traspasos", label: "Traspasos", icon: ArrowLeftRight, roles: ["ADMIN", "ENCARGADO"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["ADMIN", "ENCARGADO"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["ADMIN"] },
  { href: "/catalogos", label: "Catálogos", icon: Store, roles: ["ADMIN"] },
  { href: "/cuenta", label: "Mi cuenta", icon: KeyRound, roles: ["ADMIN", "ENCARGADO", "CAJERO"] },
];

export function NavLinks({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
      {items
        .filter((i) => i.roles.includes(rol))
        .map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition",
                activo ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
