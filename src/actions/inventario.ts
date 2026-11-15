"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permisos";
import { handleActionError } from "@/lib/action-helpers";
import {
  NoEncontradoError,
  PermisoDenegadoError,
  PrendaNoDisponibleError,
  type ActionResult,
} from "@/lib/errors";
import { bajaPrendaSchema, codigoPrendaSchema } from "@/schemas/acciones";

export type PrendaPOS = {
  id: string;
  codigo: string;
  descripcion: string;
  talla: string;
  precioVenta: number;
};

/** Busca una prenda para la caja: debe ser de la sucursal del usuario y estar disponible. */
export async function buscarPrendaPorCodigo(codigo: unknown): Promise<ActionResult<PrendaPOS>> {
  try {
    const user = await requireUser();
    if (!user.sucursalId) {
      throw new PermisoDenegadoError("Tu usuario no tiene una sucursal asignada");
    }

    const parsed = codigoPrendaSchema.safeParse(codigo);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
    }
    const cod = parsed.data.toUpperCase();

    const prenda = await prisma.prenda.findUnique({ where: { codigo: cod } });
    if (!prenda) throw new NoEncontradoError(`No existe una prenda con el código ${cod}`);

    if (prenda.sucursalId !== user.sucursalId) {
      throw new PrendaNoDisponibleError(`La prenda ${cod} pertenece a otra sucursal`);
    }
    if (prenda.estado !== "DISPONIBLE") {
      const motivos: Record<string, string> = {
        VENDIDA: "ya fue vendida",
        EN_TRASPASO: "está en traspaso",
        BAJA: "fue dada de baja",
      };
      throw new PrendaNoDisponibleError(
        `La prenda ${cod} ${motivos[prenda.estado] ?? "no está disponible"}`
      );
    }

    return {
      ok: true,
      data: {
        id: prenda.id,
        codigo: prenda.codigo,
        descripcion: prenda.descripcion,
        talla: prenda.talla,
        precioVenta: prenda.precioVenta.toNumber(),
      },
    };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function darDeBajaPrenda(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO"]);

    const parsed = bajaPrendaSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
    }
    const { prendaId, motivo } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const prenda = await tx.prenda.findUnique({ where: { id: prendaId } });
      if (!prenda) throw new NoEncontradoError("La prenda no existe");

      if (user.rol !== "ADMIN" && prenda.sucursalId !== user.sucursalId) {
        throw new PermisoDenegadoError("Solo puedes dar de baja prendas de tu sucursal");
      }

      const r = await tx.prenda.updateMany({
        where: { id: prendaId, estado: "DISPONIBLE" },
        data: { estado: "BAJA" },
      });
      if (r.count !== 1) {
        throw new PrendaNoDisponibleError("Solo se pueden dar de baja prendas disponibles");
      }

      await tx.auditLog.create({
        data: {
          accion: "PRENDA_BAJA",
          entidad: "Prenda",
          entidadId: prendaId,
          usuarioId: user.id,
          detalle: { codigo: prenda.codigo, motivo },
        },
      });
    });

    revalidatePath("/inventario");
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (e) {
    return handleActionError(e);
  }
}
