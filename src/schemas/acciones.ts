import { z } from "zod";

export const codigoPrendaSchema = z
  .string()
  .trim()
  .min(1, "Ingresa un código")
  .max(30, "Código demasiado largo")
  .regex(/^[A-Za-z0-9-]+$/, "Código inválido");

export const bajaPrendaSchema = z.object({
  prendaId: z.string().min(1),
  motivo: z
    .string()
    .trim()
    .min(3, "Describe el motivo (mínimo 3 caracteres)")
    .max(200, "Máximo 200 caracteres"),
});

export const anularVentaSchema = z.object({
  ventaId: z.string().min(1),
  motivo: z
    .string()
    .trim()
    .min(5, "Describe el motivo (mínimo 5 caracteres)")
    .max(200, "Máximo 200 caracteres"),
});

export const traspasoIdSchema = z.object({
  traspasoId: z.string().min(1),
});
