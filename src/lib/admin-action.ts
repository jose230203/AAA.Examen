import { revalidatePath } from "next/cache";
import type { Rol } from "@prisma/client";
import { requireUser, type SesionUsuario } from "@/lib/permisos";
import { handleActionError } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/errors";

/** Verifica rol, ejecuta la lógica, revalida rutas y convierte excepciones en ActionResult. */
export async function ejecutarComo<T>(
  roles: Rol[],
  paths: string[],
  fn: (user: SesionUsuario) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const user = await requireUser(roles);
    const data = await fn(user);
    paths.forEach((p) => revalidatePath(p));
    return { ok: true, data };
  } catch (e) {
    return handleActionError(e);
  }
}
