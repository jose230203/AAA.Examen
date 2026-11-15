import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/permisos";
import { NuevoUsuarioForm } from "@/components/usuarios/nuevo-usuario-form";
import { UsuarioFila } from "@/components/usuarios/usuario-fila";

export default async function UsuariosPage() {
  const yo = await requirePage(["ADMIN"]);

  const [usuarios, sucursales] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: { sucursal: { select: { nombre: true } } },
    }),
    prisma.sucursal.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);

  const opciones = sucursales.map((s) => ({ id: s.id, nombre: s.nombre }));
  const ahora = new Date();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>

      <NuevoUsuarioForm sucursales={opciones} />

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <UsuarioFila
                key={u.id}
                esYo={u.id === yo.id}
                sucursales={opciones}
                usuario={{
                  id: u.id,
                  nombre: u.nombre,
                  email: u.email,
                  rol: u.rol,
                  sucursalId: u.sucursalId,
                  sucursalNombre: u.sucursal?.nombre ?? null,
                  activo: u.activo,
                  bloqueado: !!u.bloqueadoHasta && u.bloqueadoHasta > ahora,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
