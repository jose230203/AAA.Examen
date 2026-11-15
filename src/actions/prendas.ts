"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permisos";
import { handleActionError } from "@/lib/action-helpers";
import { NoEncontradoError, ValidacionError, type ActionResult } from "@/lib/errors";
import { prendaSchema } from "@/schemas/prenda";

export async function crearPrenda(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO"]);

    const parsed = prendaSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
    }
    const d = parsed.data;

    // Encargado: siempre su sucursal. Admin: la que elija.
    const sucursalId = user.rol === "ADMIN" ? d.sucursalId : user.sucursalId;
    if (!sucursalId) throw new ValidacionError("Selecciona la sucursal de la prenda");

    const [sucursal, categoria, existente] = await Promise.all([
      prisma.sucursal.findFirst({ where: { id: sucursalId, activa: true } }),
      prisma.categoria.findUnique({ where: { id: d.categoriaId } }),
      prisma.prenda.findUnique({ where: { codigo: d.codigo.toUpperCase() } }),
    ]);
    if (!sucursal) throw new NoEncontradoError("La sucursal no existe o está inactiva");
    if (!categoria) throw new NoEncontradoError("La categoría no existe");
    if (existente) throw new ValidacionError(`El código ${d.codigo.toUpperCase()} ya está registrado`);

    const prenda = await prisma.$transaction(async (tx) => {
      const nueva = await tx.prenda.create({
        data: {
          codigo: d.codigo.toUpperCase(),
          descripcion: d.descripcion,
          talla: d.talla,
          marca: d.marca || null,
          color: d.color || null,
          condicion: d.condicion,
          precioCosto: new Prisma.Decimal(d.precioCosto).toDecimalPlaces(2),
          precioVenta: new Prisma.Decimal(d.precioVenta).toDecimalPlaces(2),
          categoriaId: d.categoriaId,
          sucursalId,
        },
      });
      await tx.auditLog.create({
        data: {
          accion: "PRENDA_CREADA",
          entidad: "Prenda",
          entidadId: nueva.id,
          usuarioId: user.id,
          detalle: { codigo: nueva.codigo, sucursalId },
        },
      });
      return nueva;
    });

    revalidatePath("/inventario");
    return { ok: true, data: { id: prenda.id } };
  } catch (e) {
    return handleActionError(e);
  }
}
