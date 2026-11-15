import { requirePage } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { formatFecha, formatMoney } from "@/lib/format";
import { EstadoBadge } from "@/components/estado-badge";
import { PosCaja } from "@/components/pos/pos-caja";
import { AnularVentaButton } from "@/components/pos/anular-venta-button";

export default async function VentasPage() {
  const user = await requirePage();
  const puedeAnular = user.rol !== "CAJERO";
  const filtro = user.sucursalId ? { sucursalId: user.sucursalId } : {};

  const ventas = await prisma.venta.findMany({
    where: filtro,
    orderBy: { fecha: "desc" },
    take: 15,
    include: {
      cajero: { select: { nombre: true } },
      sucursal: { select: { nombre: true } },
      _count: { select: { detalles: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>

      {user.sucursalId ? (
        <PosCaja sucursal={user.sucursalNombre ?? ""} cajero={user.name ?? ""} />
      ) : (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Tu usuario no tiene una sucursal asignada, por eso no puede registrar ventas. Entra con un
          usuario de sucursal (por ejemplo cajero1@tiendas.com) para usar la caja.
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">Últimas ventas</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Cajero</th>
                <th className="px-4 py-3 text-right">Prendas</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Estado</th>
                {puedeAnular && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Aún no hay ventas registradas
                  </td>
                </tr>
              )}
              {ventas.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-mono">#{v.numero}</td>
                  <td className="px-4 py-3">{formatFecha(v.fecha)}</td>
                  <td className="px-4 py-3">{v.sucursal.nombre}</td>
                  <td className="px-4 py-3">{v.cajero.nombre}</td>
                  <td className="px-4 py-3 text-right">{v._count.detalles}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(v.total.toNumber())}
                  </td>
                  <td className="px-4 py-3">{v.metodoPago}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={v.estado} />
                  </td>
                  {puedeAnular && (
                    <td className="px-4 py-3 text-right">
                      {v.estado === "COMPLETADA" && (
                        <AnularVentaButton ventaId={v.id} numero={v.numero} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
