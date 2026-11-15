"use server";

import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ejecutarComo } from "@/lib/admin-action";
import { parsear } from "@/lib/validar";
import { NoEncontradoError, ValidacionError } from "@/lib/errors";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  estadoUsuarioSchema,
  idUsuarioSchema,
  resetPasswordSchema,
} from "@/schemas/usuarios";

const PATHS = ["/usuarios"];

async function asegurarOtroAdminActivo(tx: Prisma.TransactionClient, excluirId: string) {
  const otros = await tx.usuario.count({
    where: { rol: "ADMIN", activo: true, id: { not: excluirId } },
  });
  if (otros === 0) throw new ValidacionError("Debe existir al menos un administrador activo");
}

async function validarSucursal(tx: Prisma.TransactionClient, sucursalId: string | null) {
  if (!sucursalId) return;
  const s = await tx.sucursal.findFirst({ where: { id: sucursalId, activa: true } });
  if (!s) throw new NoEncontradoError("La sucursal no existe o está inactiva");
}

export async function crearUsuario(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(crearUsuarioSchema, input);
    const sucursalId = d.sucursalId || null;

    const existe = await prisma.usuario.findUnique({ where: { email: d.email } });
    if (existe) throw new ValidacionError("Ya existe un usuario con ese correo");

    const passwordHash = await bcrypt.hash(d.password, 10);

    return prisma.$transaction(async (tx) => {
      await validarSucursal(tx, sucursalId);
      const u = await tx.usuario.create({
        data: { nombre: d.nombre, email: d.email, rol: d.rol, sucursalId, passwordHash },
      });
      await tx.auditLog.create({
        data: {
          accion: "USUARIO_CREADO",
          entidad: "Usuario",
          entidadId: u.id,
          usuarioId: admin.id,
          detalle: { email: u.email, rol: u.rol, sucursalId },
        },
      });
      return { id: u.id };
    });
  });
}

export async function actualizarUsuario(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(actualizarUsuarioSchema, input);
    const sucursalId = d.sucursalId || null;

    await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.findUnique({ where: { id: d.id } });
      if (!u) throw new NoEncontradoError("El usuario no existe");

      if (u.rol === "ADMIN" && d.rol !== "ADMIN") {
        if (u.id === admin.id) {
          throw new ValidacionError("No puedes quitarte tu propio rol de administrador");
        }
        if (u.activo) await asegurarOtroAdminActivo(tx, u.id);
      }
      if (sucursalId !== u.sucursalId) await validarSucursal(tx, sucursalId);

      await tx.usuario.update({
        where: { id: d.id },
        data: { nombre: d.nombre, rol: d.rol, sucursalId },
      });
      await tx.auditLog.create({
        data: {
          accion: "USUARIO_EDITADO",
          entidad: "Usuario",
          entidadId: d.id,
          usuarioId: admin.id,
          detalle: {
            antes: { rol: u.rol, sucursalId: u.sucursalId },
            despues: { rol: d.rol, sucursalId },
          },
        },
      });
    });
    return null;
  });
}

export async function cambiarEstadoUsuario(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(estadoUsuarioSchema, input);

    await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.findUnique({ where: { id: d.id } });
      if (!u) throw new NoEncontradoError("El usuario no existe");

      if (!d.activo) {
        if (u.id === admin.id) throw new ValidacionError("No puedes desactivar tu propio usuario");
        if (u.rol === "ADMIN" && u.activo) await asegurarOtroAdminActivo(tx, u.id);
      }

      await tx.usuario.update({ where: { id: d.id }, data: { activo: d.activo } });
      await tx.auditLog.create({
        data: {
          accion: d.activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO",
          entidad: "Usuario",
          entidadId: d.id,
          usuarioId: admin.id,
        },
      });
    });
    return null;
  });
}

export async function desbloquearUsuario(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(idUsuarioSchema, input);
    const u = await prisma.usuario.findUnique({ where: { id: d.id } });
    if (!u) throw new NoEncontradoError("El usuario no existe");

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: d.id },
        data: { intentosFallidos: 0, bloqueadoHasta: null },
      }),
      prisma.auditLog.create({
        data: { accion: "USUARIO_DESBLOQUEADO", entidad: "Usuario", entidadId: d.id, usuarioId: admin.id },
      }),
    ]);
    return null;
  });
}

export async function resetearPassword(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(resetPasswordSchema, input);
    const u = await prisma.usuario.findUnique({ where: { id: d.id } });
    if (!u) throw new NoEncontradoError("El usuario no existe");

    const passwordHash = await bcrypt.hash(d.password, 10);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: d.id },
        data: { passwordHash, intentosFallidos: 0, bloqueadoHasta: null },
      }),
      // La contraseña nunca se guarda en la auditoría
      prisma.auditLog.create({
        data: { accion: "PASSWORD_RESTABLECIDA", entidad: "Usuario", entidadId: d.id, usuarioId: admin.id },
      }),
    ]);
    return null;
  });
}
