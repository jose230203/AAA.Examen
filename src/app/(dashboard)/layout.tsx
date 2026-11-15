import { redirect } from "next/navigation";
import { LogOut, Shirt } from "lucide-react";
import { auth } from "@/auth";
import { logoutAction } from "@/actions/auth";
import { NavLinks } from "@/components/nav-links";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { name, rol, sucursalNombre } = session.user;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 pt-4 md:pb-2">
          <Shirt size={22} />
          <span className="font-bold text-slate-900">Tiendas de Ropa</span>
        </div>
        <NavLinks rol={rol} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">
              {rol} · {sucursalNombre ?? "Todas las sucursales"}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <LogOut size={16} /> Salir
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
