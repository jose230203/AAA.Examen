import { Prisma } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { formatFecha } from "@/lib/format";
import { EstadoBadge } from "@/components/estado-badge";
import { NuevoTraspasoForm } from "@/components/traspasos/nuevo-traspaso-form";
import { TraspasoAcciones } from "@/components/traspasos/traspaso-acciones";

export default async function TraspasosPage() {
  const user = await requirePage(["ADMIN", "ENCARGADO"]);
  const esAdmin = user.rol === "ADMIN";

  const where: Prisma.TraspasoWhereInput = esAdmin
    ? {}
    : { OR: [{ origenId: user.sucursalId ?? "" }, { destinoId: user.sucursalId ?? "" }] };

  const [traspasos, sucursales] = await Promise.all([
    prisma.traspaso.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: 30,
      include: {
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        creadoPor: { select: { nombre: true } },
        detalles: { include: { prenda: { select: { codigo: true, descripcion: true } } } },
      },
    }),
    prisma.sucursal.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);

  const opciones = sucursales.map((s) => ({ id: s.id, nombre: s.nombre }));
  const origenes = esAdmin ? opciones : opciones.filter((s) => s.id === user.sucursalId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Traspasos</h1>

      <NuevoTraspasoForm sucursalesOrigen={origenes} sucursalesDestino={opciones} />

      {traspasos.length === 0 && (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Aún no hay traspasos
        </p>
      )}

      {traspasos.map((t) => {
        const esOrigen = esAdmin || user.sucursalId === t.origenId;
        const esDestino = esAdmin || user.sucursalId === t.destinoId;

        return (
          <article key={t.id} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <span className="font-mono">#{t.numero}</span>
                <span>{t.origen.nombre}</span>
                <ArrowRight size={16} className="text-slate-400" />
                <span>{t.destino.nombre}</span>
              </div>
              <EstadoBadge estado={t.estado} />
            </div>

            <p className="text-sm text-slate-500">
              {formatFecha(t.fecha)} · Creado por {t.creadoPor.nombre}
              {t.fechaRecibido && ` · Recibido ${formatFecha(t.fechaRecibido)}`}
            </p>
            {t.notas && <p className="text-sm text-slate-600">Notas: {t.notas}</p>}

            <div className="flex flex-wrap gap-1">
              {t.detalles.map((d) => (
                <span
                  key={d.id}
                  title={d.prenda.descripcion}
                  className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs"
                >
                  {d.prenda.codigo}
                </span>
              ))}
            </div>

            <TraspasoAcciones
              traspasoId={t.id}
              puedeEnviar={esOrigen && t.estado === "PENDIENTE"}
              puedeRecibir={esDestino && t.estado === "EN_TRANSITO"}
              puedeCancelar={esOrigen && (t.estado === "PENDIENTE" || t.estado === "EN_TRANSITO")}
            />
          </article>
        );
      })}
    </div>
  );
}
