"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ejecutarComo } from "@/lib/admin-action";
import { parsear } from "@/lib/validar";
import { NoEncontradoError, ValidacionError } from "@/lib/errors";
import {
  actualizarCategoriaSchema,
  actualizarSucursalSchema,
  categoriaSchema,
  estadoSucursalSchema,
  idSchema,
  sucursalSchema,
} from "@/schemas/catalogos";

const PATHS = ["/catalogos", "/inventario", "/traspasos", "/usuarios"];
const igual = (nombre: string) => ({ equals: nombre, mode: Prisma.QueryMode.insensitive });

export async function crearSucursal(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(sucursalSchema, input);
    if (await prisma.sucursal.findFirst({ where: { nombre: igual(d.nombre) } })) {
      throw new ValidacionError("Ya existe una sucursal con ese nombre");
    }
    const s = await prisma.sucursal.create({
      data: { nombre: d.nombre, direccion: d.direccion || null, telefono: d.telefono || null },
    });
    await prisma.auditLog.create({
      data: { accion: "SUCURSAL_CREADA", entidad: "Sucursal", entidadId: s.id, usuarioId: admin.id },
    });
    return { id: s.id };
  });
}

export async function actualizarSucursal(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(actualizarSucursalSchema, input);
    const actual = await prisma.sucursal.findUnique({ where: { id: d.id } });
    if (!actual) throw new NoEncontradoError("La sucursal no existe");
    if (await prisma.sucursal.findFirst({ where: { nombre: igual(d.nombre), id: { not: d.id } } })) {
      throw new ValidacionError("Ya existe otra sucursal con ese nombre");
    }
    await prisma.sucursal.update({
      where: { id: d.id },
      data: { nombre: d.nombre, direccion: d.direccion || null, telefono: d.telefono || null },
    });
    await prisma.auditLog.create({
      data: { accion: "SUCURSAL_EDITADA", entidad: "Sucursal", entidadId: d.id, usuarioId: admin.id },
    });
    return null;
  });
}

export async function cambiarEstadoSucursal(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async (admin) => {
    const d = parsear(estadoSucursalSchema, input);
    const s = await prisma.sucursal.findUnique({ where: { id: d.id } });
    if (!s) throw new NoEncontradoError("La sucursal no existe");

    if (!d.activa) {
      const [prendas, traspasos, usuarios] = await Promise.all([
        prisma.prenda.count({
          where: { sucursalId: d.id, estado: { in: ["DISPONIBLE", "EN_TRASPASO"] } },
        }),
        prisma.traspaso.count({
          where: {
            estado: { in: ["PENDIENTE", "EN_TRANSITO"] },
            OR: [{ origenId: d.id }, { destinoId: d.id }],
          },
        }),
        prisma.usuario.count({ where: { sucursalId: d.id, activo: true } }),
      ]);
      if (prendas > 0) {
        throw new ValidacionError(`La sucursal aún tiene ${prendas} prenda(s) en inventario. Traspásalas primero.`);
      }
      if (traspasos > 0) {
        throw new ValidacionError("La sucursal tiene traspasos pendientes o en tránsito");
      }
      if (usuarios > 0) {
        throw new ValidacionError(`La sucursal tiene ${usuarios} usuario(s) activos. Reasígnalos o desactívalos primero.`);
      }
    }

    await prisma.sucursal.update({ where: { id: d.id }, data: { activa: d.activa } });
    await prisma.auditLog.create({
      data: {
        accion: d.activa ? "SUCURSAL_ACTIVADA" : "SUCURSAL_DESACTIVADA",
        entidad: "Sucursal",
        entidadId: d.id,
        usuarioId: admin.id,
      },
    });
    return null;
  });
}

export async function crearCategoria(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async () => {
    const d = parsear(categoriaSchema, input);
    if (await prisma.categoria.findFirst({ where: { nombre: igual(d.nombre) } })) {
      throw new ValidacionError("Ya existe una categoría con ese nombre");
    }
    const c = await prisma.categoria.create({ data: { nombre: d.nombre } });
    return { id: c.id };
  });
}

export async function renombrarCategoria(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async () => {
    const d = parsear(actualizarCategoriaSchema, input);
    if (!(await prisma.categoria.findUnique({ where: { id: d.id } }))) {
      throw new NoEncontradoError("La categoría no existe");
    }
    if (await prisma.categoria.findFirst({ where: { nombre: igual(d.nombre), id: { not: d.id } } })) {
      throw new ValidacionError("Ya existe otra categoría con ese nombre");
    }
    await prisma.categoria.update({ where: { id: d.id }, data: { nombre: d.nombre } });
    return null;
  });
}

export async function eliminarCategoria(input: unknown) {
  return ejecutarComo(["ADMIN"], PATHS, async () => {
    const d = parsear(idSchema, input);
    const usos = await prisma.prenda.count({ where: { categoriaId: d.id } });
    if (usos > 0) {
      throw new ValidacionError(`No se puede eliminar: tiene ${usos} prenda(s) asociadas`);
    }
    await prisma.categoria.delete({ where: { id: d.id } });
    return null;
  });
}
