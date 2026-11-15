import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { CatalogosAdmin } from "@/components/catalogos/catalogos-admin";

export default async function CatalogosPage() {
  await requirePage(["ADMIN"]);

  const [sucursales, categorias] = await Promise.all([
    prisma.sucursal.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { prendas: true } } },
    }),
    prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { prendas: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Catálogos</h1>
      <CatalogosAdmin
        sucursales={sucursales.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          direccion: s.direccion,
          telefono: s.telefono,
          activa: s.activa,
          prendas: s._count.prendas,
        }))}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, prendas: c._count.prendas }))}
      />
    </div>
  );
}
