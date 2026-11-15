"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permisos";
import { handleActionError } from "@/lib/action-helpers";
import {
  NoEncontradoError,
  PrendaNoDisponibleError,
  type ActionResult,
} from "@/lib/errors";
import {
  cancelarTraspaso,
  crearTraspaso,
  enviarTraspaso,
  recibirTraspaso,
  type Actor,
} from "@/lib/traspasos-service";
import { traspasoCodigosSchema } from "@/schemas/traspaso";
import { traspasoIdSchema } from "@/schemas/acciones";

function refrescar() {
  revalidatePath("/traspasos");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
}

export async function crearTraspasoAction(
  input: unknown
): Promise<ActionResult<{ id: string; numero: number }>> {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO"]);

    const parsed = traspasoCodigosSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
    }
    const { origenId, destinoId, codigos, notas } = parsed.data;

    // Convierte códigos → prendas y valida antes de entrar a la transacción
    const unicos = [...new Set(codigos.map((c) => c.toUpperCase()))];
    const prendas = await prisma.prenda.findMany({
      where: { codigo: { in: unicos } },
      select: { id: true, codigo: true, sucursalId: true, estado: true },
    });

    const encontrados = new Set(prendas.map((p) => p.codigo));
    const faltan = unicos.filter((c) => !encontrados.has(c));
    if (faltan.length) {
      throw new NoEncontradoError(`No existen estos códigos: ${faltan.join(", ")}`);
    }

    const noValidas = prendas
      .filter((p) => p.sucursalId !== origenId || p.estado !== "DISPONIBLE")
      .map((p) => p.codigo);
    if (noValidas.length) {
      throw new PrendaNoDisponibleError(
        `Estas prendas no están disponibles en la sucursal de origen: ${noValidas.join(", ")}`
      );
    }

    const t = await crearTraspaso({
      origenId,
      destinoId,
      prendaIds: prendas.map((p) => p.id),
      notas,
      actor: user,
    });

    refrescar();
    return { ok: true, data: t };
  } catch (e) {
    return handleActionError(e);
  }
}

async function ejecutar(
  input: unknown,
  fn: (traspasoId: string, actor: Actor) => Promise<unknown>
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO"]);
    const parsed = traspasoIdSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Traspaso inválido", code: "VALIDACION" };
    }
    await fn(parsed.data.traspasoId, user);
    refrescar();
    return { ok: true, data: null };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function enviarTraspasoAction(input: unknown) {
  return ejecutar(input, enviarTraspaso);
}

export async function recibirTraspasoAction(input: unknown) {
  return ejecutar(input, recibirTraspaso);
}

export async function cancelarTraspasoAction(input: unknown) {
  return ejecutar(input, cancelarTraspaso);
}
