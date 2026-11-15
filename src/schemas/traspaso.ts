import { z } from "zod";

export const traspasoSchema = z
  .object({
    origenId: z.string().min(1, "Selecciona la sucursal de origen"),
    destinoId: z.string().min(1, "Selecciona la sucursal destino"),
    prendaIds: z
      .array(z.string().min(1))
      .min(1, "Selecciona al menos una prenda")
      .max(100, "Máximo 100 prendas por traspaso")
      .refine((ids) => new Set(ids).size === ids.length, "Hay prendas repetidas"),
    notas: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  })
  .refine((d) => d.origenId !== d.destinoId, {
    message: "El origen y el destino no pueden ser la misma sucursal",
    path: ["destinoId"],
  });

export type TraspasoInput = z.input<typeof traspasoSchema>;

export const traspasoCodigosSchema = z
  .object({
    origenId: z.string().min(1, "Selecciona la sucursal de origen"),
    destinoId: z.string().min(1, "Selecciona la sucursal destino"),
    codigos: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(30)
          .regex(/^[A-Za-z0-9-]+$/, "Hay un código con caracteres inválidos")
      )
      .min(1, "Ingresa al menos un código")
      .max(100, "Máximo 100 prendas por traspaso"),
    notas: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  })
  .refine((d) => d.origenId !== d.destinoId, {
    message: "El origen y el destino no pueden ser la misma sucursal",
    path: ["destinoId"],
  });

export type TraspasoCodigosInput = z.input<typeof traspasoCodigosSchema>;