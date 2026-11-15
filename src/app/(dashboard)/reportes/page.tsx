import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { formatMoney } from "@/lib/format";
import { filtroReporteSchema } from "@/schemas/reportes";
import {
  hoyClave,
  obtenerReporte,
  prendasAntiguas,
  resumenStock,
  sumarDias,
} from "@/lib/reportes-service";
import { ColumnasDias, ListaBarras } from "@/components/reportes/graficas";

type SP = { desde?: string; hasta?: string; sucursal?: string };

export default async function ReportesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage(["ADMIN", "ENCARGADO"]);
  const sp = await searchParams;
  const esAdmin = user.rol === "ADMIN";

  const hoy = hoyClave();
  const porDefecto = { desde: sumarDias(hoy, -6), hasta: hoy };

  const parsed = filtroReporteSchema.safeParse({
    desde: sp.desde || porDefecto.desde,
    hasta: sp.hasta || porDefecto.hasta,
    sucursal: sp.sucursal || undefined,
  });
  const errorFiltro = parsed.success ? null : parsed.error.issues[0].message;
  const filtro = parsed.success ? parsed.data : { ...porDefecto, sucursal: undefined };

  // El encargado solo ve su sucursal (si no tuviera, un id inexistente devuelve vacío)
  const sucursalId = esAdmin ? filtro.sucursal : (user.sucursalId ?? "__ninguna__");

  const [reporte, stock, antiguas, sucursales] = await Promise.all([
    obtenerReporte({ desde: filtro.desde, hasta: filtro.hasta, sucursalId }),
    resumenStock(sucursalId),
    prendasAntiguas(sucursalId, 10),
    esAdmin ? prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }) : Promise.resolve([]),
  ]);

  const exportParams = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta });
  if (esAdmin && filtro.sucursal) exportParams.set("sucursal", filtro.sucursal);

  const r = reporte.resumen;
  const tarjetas = [
    { titulo: "Ventas", valor: String(r.ventas) },
    { titulo: "Monto vendido", valor: formatMoney(r.monto) },
    { titulo: "Descuentos", valor: formatMoney(r.descuentos) },
    { titulo: "Utilidad bruta", valor: formatMoney(r.utilidad) },
    { titulo: "Ticket promedio", valor: formatMoney(r.ticketPromedio) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <a
          href={`/reportes/export?${exportParams.toString()}`}
          className="flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <Download size={16} /> Exportar CSV
        </a>
      </div>

      <form method="get" action="/reportes" className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Desde</span>
          <input type="date" name="desde" defaultValue={filtro.desde} className="h-11 rounded-lg border border-slate-300 px-3" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Hasta</span>
          <input type="date" name="hasta" defaultValue={filtro.hasta} className="h-11 rounded-lg border border-slate-300 px-3" />
        </label>
        {esAdmin && (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Sucursal</span>
            <select name="sucursal" defaultValue={filtro.sucursal ?? ""} className="h-11 rounded-lg border border-slate-300 bg-white px-3">
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">
          Aplicar
        </button>
        <Link href="/reportes" className="px-2 py-3 text-sm text-slate-500 hover:underline">
          Últimos 7 días
        </Link>
      </form>

      {errorFiltro && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {errorFiltro}. Se muestran los últimos 7 días.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{t.titulo}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{t.valor}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">Ventas por día</h3>
        <ColumnasDias items={reporte.porDia.map((d) => ({ etiqueta: d.etiqueta, valor: d.monto }))} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {esAdmin && !filtro.sucursal && (
          <ListaBarras
            titulo="Por sucursal"
            items={reporte.porSucursal.map((x) => ({ etiqueta: x.nombre, valor: x.monto, detalle: `${x.ventas} ventas` }))}
          />
        )}
        <ListaBarras
          titulo="Por cajero"
          items={reporte.porCajero.map((x) => ({ etiqueta: x.nombre, valor: x.monto, detalle: `${x.ventas} ventas` }))}
        />
        <ListaBarras
          titulo="Por método de pago"
          items={reporte.porMetodo.map((x) => ({ etiqueta: x.nombre, valor: x.monto, detalle: `${x.ventas} ventas` }))}
        />
        <ListaBarras
          titulo="Por categoría"
          items={reporte.porCategoria.map((x) => ({ etiqueta: x.nombre, valor: x.monto, detalle: `${x.prendas} prendas` }))}
        />
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">Inventario disponible</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Sucursal</th>
                <th className="py-2 text-right">Prendas</th>
                <th className="py-2 text-right">Costo</th>
                <th className="py-2 text-right">Valor de venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stock.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    Sin inventario disponible
                  </td>
                </tr>
              )}
              {stock.map((s) => (
                <tr key={s.nombre}>
                  <td className="py-2">{s.nombre}</td>
                  <td className="py-2 text-right">{s.prendas}</td>
                  <td className="py-2 text-right">{formatMoney(s.costo)}</td>
                  <td className="py-2 text-right">{formatMoney(s.valorVenta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-900">Prendas con más tiempo en inventario</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Código</th>
                <th className="py-2">Descripción</th>
                <th className="py-2">Sucursal</th>
                <th className="py-2 text-right">Precio</th>
                <th className="py-2 text-right">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {antiguas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Sin prendas disponibles
                  </td>
                </tr>
              )}
              {antiguas.map((p) => (
                <tr key={p.codigo}>
                  <td className="py-2 font-mono">{p.codigo}</td>
                  <td className="py-2">{p.descripcion}</td>
                  <td className="py-2">{p.sucursal}</td>
                  <td className="py-2 text-right">{formatMoney(p.precioVenta)}</td>
                  <td className="py-2 text-right font-medium">{p.dias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
