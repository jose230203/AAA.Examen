"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/schemas/auth";
import { handleActionError } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/errors";

export async function loginAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDACION" };
  }
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { ok: true, data: null };
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        ok: false,
        error: "Correo o contraseña incorrectos, o usuario bloqueado temporalmente",
        code: "CREDENCIALES",
      };
    }
    return handleActionError(e);
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
