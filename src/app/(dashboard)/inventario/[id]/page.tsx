import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { formatFecha } from "@/lib/format";
import { EstadoBadge } from "@/components/estado-badge";
import { EditarPrendaForm } from "@/components/inventario/editar-prenda-form";
import { CONDICIONES } from "@/schemas/prenda";

type Detalle = { motivo?: string; antes?: { precioVenta?: string }; despues?: { precioVenta?: string } };

export default async function PrendaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage(["ADMIN", "ENCARGADO"]);
  const { id } = await params;

  const prenda = await prisma.prenda.findUnique({
    where: { id },
    include: { categoria: true, sucursal: true },
  });
  if (!prenda) notFound();
  if (user.rol !== "ADMIN" && prenda.sucursalId !== user.sucursalId) notFound();

  const [categorias, historial] = await Promise.all([
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
    prisma.auditLog.findMany({
      where: { entidad: "Prenda", entidadId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { usuario: { select: { nombre: true } } },
    }),
  ]);

  const condicion = (CONDICIONES as readonly string[]).includes(prenda.condicion)
    ? (prenda.condicion as (typeof CONDICIONES)[number])
    : "BUENA";

  return (
    <div className="space-y-4">
      <Link href="/inventario" className="flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft size={14} /> Volver al inventario
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-slate-900">{prenda.codigo}</h1>
        <EstadoBadge estado={prenda.estado} />
        <span className="text-sm text-slate-500">
          {prenda.sucursal.nombre} · {prenda.categoria.nombre}
        </span>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Datos de la prenda</h2>
        {prenda.estado === "DISPONIBLE" ? (
          <EditarPrendaForm
            categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
            prenda={{
              id: prenda.id,
              descripcion: prenda.descripcion,
              talla: prenda.talla,
              marca: prenda.marca ?? "",
              color: prenda.color ?? "",
              condicion,
              precioCosto: prenda.precioCosto.toNumber(),
              precioVenta: prenda.precioVenta.toNumber(),
              categoriaId: prenda.categoriaId,
            }}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Solo se pueden editar prendas disponibles. Esta prenda está {prenda.estado.replace("_", " ").toLowerCase()}.
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Historial de cambios</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">Sin movimientos registrados</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {historial.map((h) => {
              const d = (h.detalle ?? {}) as unknown as Detalle;
              return (
                <li key={h.id} className="py-2">
                  <span className="font-medium">{h.accion.replaceAll("_", " ")}</span>
                  <span className="text-slate-500">
                    {" "}
                    · {h.usuario?.nombre ?? "Sistema"} · {formatFecha(h.createdAt)}
                  </span>
                  {d.motivo && <p className="text-slate-500">Motivo: {d.motivo}</p>}
                  {d.antes?.precioVenta && d.despues?.precioVenta && (
                    <p className="text-slate-500">
                      Precio de venta: {d.antes.precioVenta} → {d.despues.precioVenta}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
