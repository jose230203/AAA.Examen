import Link from "next/link";
import { Prisma, type EstadoPrenda } from "@prisma/client";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { formatMoney } from "@/lib/format";
import { EstadoBadge } from "@/components/estado-badge";
import { NuevaPrendaForm } from "@/components/inventario/nueva-prenda-form";
import { BajaPrendaButton } from "@/components/inventario/baja-prenda-button";

const POR_PAGINA = 20;
const ESTADOS: EstadoPrenda[] = ["DISPONIBLE", "VENDIDA", "EN_TRASPASO", "BAJA"];

type SP = { q?: string; estado?: string; categoria?: string; sucursal?: string; page?: string };

const selectCls = "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm";

export default async function InventarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage();
  const sp = await searchParams;

  const esAdmin = user.rol === "ADMIN";
  const puedeGestionar = user.rol !== "CAJERO";
  const sucursalFiltro = user.sucursalId ?? (sp.sucursal || undefined);
  const estado = ESTADOS.includes(sp.estado as EstadoPrenda)
    ? (sp.estado as EstadoPrenda)
    : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim();

  const where: Prisma.PrendaWhereInput = {
    ...(sucursalFiltro ? { sucursalId: sucursalFiltro } : {}),
    ...(estado ? { estado } : {}),
    ...(sp.categoria ? { categoriaId: sp.categoria } : {}),
    ...(q
      ? {
          OR: [
            { codigo: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { descripcion: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { marca: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  const [prendas, total, categorias, sucursales] = await Promise.all([
    prisma.prenda.findMany({
      where,
      include: { categoria: true, sucursal: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.prenda.count({ where }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
    prisma.sucursal.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const link = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    params.set("page", String(p));
    return `/inventario?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
      </div>

      {puedeGestionar && (
        <NuevaPrendaForm
          esAdmin={esAdmin}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
          sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre }))}
        />
      )}

      <form
        method="get"
        action="/inventario"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm"
      >
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Código, descripción o marca"
          className="h-11 min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <select name="estado" defaultValue={estado ?? ""} className={selectCls}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace("_", " ")}
            </option>
          ))}
        </select>
        <select name="categoria" defaultValue={sp.categoria ?? ""} className={selectCls}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        {esAdmin && (
          <select name="sucursal" defaultValue={sp.sucursal ?? ""} className={selectCls}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"
        >
          <Search size={16} /> Filtrar
        </button>
        <Link href="/inventario" className="px-2 text-sm text-slate-500 hover:underline">
          Limpiar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Talla</th>
              <th className="px-4 py-3">Categoría</th>
              {esAdmin && <th className="px-4 py-3">Sucursal</th>}
              {puedeGestionar && <th className="px-4 py-3 text-right">Costo</th>}
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3">Estado</th>
              {puedeGestionar && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prendas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No hay prendas con esos filtros
                </td>
              </tr>
            )}
            {prendas.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono font-medium">{puedeGestionar ? <Link href={`/inventario/${p.id}`} className="text-blue-700 hover:underline">{p.codigo}</Link> : p.codigo}</td>
                <td className="px-4 py-3">
                  {p.descripcion}
                  {p.marca && <span className="text-slate-400"> · {p.marca}</span>}
                </td>
                <td className="px-4 py-3">{p.talla}</td>
                <td className="px-4 py-3">{p.categoria.nombre}</td>
                {esAdmin && <td className="px-4 py-3">{p.sucursal.nombre}</td>}
                {puedeGestionar && (
                  <td className="px-4 py-3 text-right">{formatMoney(p.precioCosto.toNumber())}</td>
                )}
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(p.precioVenta.toNumber())}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={p.estado} />
                </td>
                {puedeGestionar && (
                  <td className="px-4 py-3 text-right">
                    {p.estado === "DISPONIBLE" && (
                      <BajaPrendaButton prendaId={p.id} codigo={p.codigo} />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {total} prendas · Página {page} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={link(page - 1)} className="rounded-lg bg-white px-4 py-2 shadow-sm">
              Anterior
            </Link>
          )}
          {page < totalPaginas && (
            <Link href={link(page + 1)} className="rounded-lg bg-white px-4 py-2 shadow-sm">
              Siguiente
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
