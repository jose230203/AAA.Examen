import type { z } from "zod";
import { ValidacionError } from "@/lib/errors";

/** Valida con Zod y lanza ValidacionError con el primer mensaje si falla. */
export function parsear<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidacionError(r.error.issues[0].message);
  return r.data;
}
