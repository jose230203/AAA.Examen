import { Prisma } from "@prisma/client";
import { AppError, type ActionResult } from "@/lib/errors";

/** Convierte cualquier excepción en una respuesta segura para el cliente. */
export function handleActionError(e: unknown): ActionResult<never> {
  if (e instanceof AppError) {
    return { ok: false, error: e.message, code: e.code };
  }

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case "P2002":
        return { ok: false, error: "Ya existe un registro con ese valor", code: "DUPLICADO" };
      case "P2025":
        return { ok: false, error: "El registro no existe", code: "NO_ENCONTRADO" };
      case "P2003":
        return { ok: false, error: "Referencia a un registro inválido", code: "RELACION" };
    }
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    console.error("[DB] Error de conexión:", e.message);
    return {
      ok: false,
      error: "No se pudo conectar con la base de datos. Intenta de nuevo.",
      code: "DB_CONEXION",
    };
  }

  console.error("[ACTION] Error inesperado:", e);
  return {
    ok: false,
    error: "Ocurrió un error inesperado. Intenta de nuevo.",
    code: "INTERNO",
  };
}
