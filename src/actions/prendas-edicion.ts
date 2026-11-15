"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ejecutarComo } from "@/lib/admin-action";
import { parsear } from "@/lib/validar";
import {
  NoEncontradoError,
  PermisoDenegadoError,
  PrendaNoDisponibleError,
} from "@/lib/errors";
import { editarPrendaSchema } from "@/schemas/prenda";

export async function actualizarPrenda(input: unknown) {
  return ejecutarComo(["ADMIN", "ENCARGADO"], ["/inventario"], async (user) => {
    const d = parsear(editarPrendaSchema, input);
    const costo = new Prisma.Decimal(d.precioCosto).toDecimalPlaces(2);
    const precio = new Prisma.Decimal(d.precioVenta).toDecimalPlaces(2);

    await prisma.$transaction(async (tx) => {
      const prenda = await tx.prenda.findUnique({ where: { id: d.id } });
      if (!prenda) throw new NoEncontradoError("La prenda no existe");
      if (user.rol !== "ADMIN" && prenda.sucursalId !== user.sucursalId) {
        throw new PermisoDenegadoError("Solo puedes editar prendas de tu sucursal");
      }
      if (!(await tx.categoria.findUnique({ where: { id: d.categoriaId } }))) {
        throw new NoEncontradoError("La categoría no existe");
      }

      // Solo prendas disponibles: editar una ya vendida alteraría el costo histórico de los reportes
      const r = await tx.prenda.updateMany({
        where: { id: d.id, estado: "DISPONIBLE" },
        data: {
          descripcion: d.descripcion,
          talla: d.talla,
          marca: d.marca || null,
          color: d.color || null,
          condicion: d.condicion,
          precioCosto: costo,
          precioVenta: precio,
          categoriaId: d.categoriaId,
        },
      });
      if (r.count !== 1) {
        throw new PrendaNoDisponibleError("Solo se pueden editar prendas disponibles");
      }

      await tx.auditLog.create({
        data: {
          accion: "PRENDA_EDITADA",
          entidad: "Prenda",
          entidadId: d.id,
          usuarioId: user.id,
          detalle: {
            codigo: prenda.codigo,
            antes: {
              precioCosto: prenda.precioCosto.toString(),
              precioVenta: prenda.precioVenta.toString(),
            },
            despues: { precioCosto: costo.toString(), precioVenta: precio.toString() },
          },
        },
      });
    });

    revalidatePath(`/inventario/${d.id}`);
    return null;
  });
}
