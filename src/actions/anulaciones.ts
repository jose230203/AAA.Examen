"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/permisos";
import { handleActionError } from "@/lib/action-helpers";
import { anularVenta } from "@/lib/ventas-service";
import type { ActionResult } from "@/lib/errors";
import { anularVentaSchema } from "@/schemas/acciones";

export async function anularVentaAction(input: unknown): Promise<ActionResult<{ numero: number }>> {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO"]);

    const parsed = anularVentaSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
    }

    const r = await anularVenta({
      ventaId: parsed.data.ventaId,
      motivo: parsed.data.motivo,
      userId: user.id,
      rol: user.rol,
      sucursalId: user.sucursalId,
    });

    revalidatePath("/ventas");
    revalidatePath("/inventario");
    revalidatePath("/dashboard");
    return { ok: true, data: r };
  } catch (e) {
    return handleActionError(e);
  }
}
