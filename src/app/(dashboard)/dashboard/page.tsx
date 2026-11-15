import { DollarSign, Package, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requirePage();
  const filtro = user.sucursalId ? { sucursalId: user.sucursalId } : {};

  // Nota: en Vercel el servidor está en UTC, así que "hoy" puede desfasarse.
  // Lo corregimos con zona horaria en el módulo de reportes.
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const [disponibles, ventasHoy] = await Promise.all([
    prisma.prenda.count({ where: { ...filtro, estado: "DISPONIBLE" } }),
    prisma.venta.aggregate({
      where: { ...filtro, estado: "COMPLETADA", fecha: { gte: inicioDia } },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const tarjetas = [
    { titulo: "Prendas disponibles", valor: String(disponibles), icon: Package },
    { titulo: "Ventas de hoy", valor: String(ventasHoy._count), icon: ShoppingCart },
    {
      titulo: "Total vendido hoy",
      valor: formatMoney(ventasHoy._sum.total?.toNumber() ?? 0),
      icon: DollarSign,
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Resumen</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {tarjetas.map(({ titulo, valor, icon: Icon }) => (
          <div key={titulo} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <Icon size={18} />
              <span className="text-sm">{titulo}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
