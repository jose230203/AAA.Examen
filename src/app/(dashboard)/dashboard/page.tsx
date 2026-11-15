import { DollarSign, Package, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { formatMoney } from "@/lib/format";
import { hoyClave, obtenerReporte, sumarDias } from "@/lib/reportes-service";
import { ColumnasDias } from "@/components/reportes/graficas";

export default async function DashboardPage() {
  const user = await requirePage();
  const sucursalId = user.sucursalId ?? undefined;
  const hoy = hoyClave();

  const [disponibles, reporte] = await Promise.all([
    prisma.prenda.count({ where: { estado: "DISPONIBLE", ...(sucursalId ? { sucursalId } : {}) } }),
    obtenerReporte({ desde: sumarDias(hoy, -6), hasta: hoy, sucursalId }),
  ]);

  const dia = reporte.porDia[reporte.porDia.length - 1];

  const tarjetas = [
    { titulo: "Prendas disponibles", valor: String(disponibles), icon: Package },
    { titulo: "Ventas de hoy", valor: String(dia?.ventas ?? 0), icon: ShoppingCart },
    { titulo: "Total vendido hoy", valor: formatMoney(dia?.monto ?? 0), icon: DollarSign },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Resumen</h1>

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

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Ventas de los últimos 7 días</h2>
        <ColumnasDias items={reporte.porDia.map((d) => ({ etiqueta: d.etiqueta, valor: d.monto }))} />
      </section>
    </div>
  );
}
