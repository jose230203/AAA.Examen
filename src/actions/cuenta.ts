"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ejecutarComo } from "@/lib/admin-action";
import { parsear } from "@/lib/validar";
import { NoEncontradoError, ValidacionError } from "@/lib/errors";
import { cambiarPasswordSchema } from "@/schemas/usuarios";

export async function cambiarMiPassword(input: unknown) {
  return ejecutarComo(["ADMIN", "ENCARGADO", "CAJERO"], [], async (user) => {
    const d = parsear(cambiarPasswordSchema, input);

    const u = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!u) throw new NoEncontradoError("Usuario no encontrado");

    const ok = await bcrypt.compare(d.actual, u.passwordHash);
    if (!ok) throw new ValidacionError("La contraseña actual es incorrecta");

    const passwordHash = await bcrypt.hash(d.nueva, 10);
    await prisma.$transaction([
      prisma.usuario.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.auditLog.create({
        data: { accion: "PASSWORD_CAMBIADA", entidad: "Usuario", entidadId: user.id, usuarioId: user.id },
      }),
    ]);
    return null;
  });
}
