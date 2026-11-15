"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/permisos";
import { handleActionError } from "@/lib/action-helpers";
import { registrarVenta } from "@/lib/ventas-service";
import { PermisoDenegadoError, type ActionResult } from "@/lib/errors";
import { ventaSchema } from "@/schemas/venta";

export async function crearVenta(
  input: unknown
): Promise<ActionResult<{ id: string; numero: number; total: string }>> {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO", "CAJERO"]);

    if (!user.sucursalId) {
      throw new PermisoDenegadoError("Tu usuario no tiene una sucursal asignada para vender");
    }

    const parsed = ventaSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
    }

    const venta = await registrarVenta({
      ...parsed.data,
      sucursalId: user.sucursalId,
      cajeroId: user.id,
      rol: user.rol,
    });

    revalidatePath("/inventario");
    revalidatePath("/ventas");
    revalidatePath("/dashboard");
    return { ok: true, data: venta };
  } catch (e) {
    return handleActionError(e);
  }
}
