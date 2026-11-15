import { redirect } from "next/navigation";
import type { Rol } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PermisoDenegadoError } from "@/lib/errors";

export type SesionUsuario = {
  id: string;
  nombre: string;
  rol: Rol;
  sucursalId: string | null;
};

/** Para Server Actions: lanza PermisoDenegadoError si no cumple. */
export async function requireUser(roles?: Rol[]): Promise<SesionUsuario> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new PermisoDenegadoError("Debes iniciar sesión");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { id: true, nombre: true, rol: true, sucursalId: true, activo: true },
  });
  if (!usuario || !usuario.activo) {
    throw new PermisoDenegadoError("Tu usuario está inactivo");
  }
  if (roles && !roles.includes(usuario.rol)) {
    throw new PermisoDenegadoError();
  }
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    sucursalId: usuario.sucursalId,
  };
}

/** Para páginas: redirige en vez de lanzar error. */
export async function requirePage(roles?: Rol[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (roles && !roles.includes(session.user.rol)) redirect("/dashboard");
  return session.user;
}
