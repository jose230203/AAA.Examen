import { z } from "zod";

export const METODOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"] as const;

export const ventaSchema = z.object({
  prendaIds: z
    .array(z.string().min(1))
    .min(1, "Agrega al menos una prenda")
    .max(50, "Máximo 50 prendas por venta")
    .refine((ids) => new Set(ids).size === ids.length, "Hay prendas repetidas"),
  descuento: z
    .number({ message: "Descuento inválido" })
    .min(0, "El descuento no puede ser negativo")
    .max(100000)
    .default(0),
  metodoPago: z.enum(METODOS_PAGO, { message: "Método de pago inválido" }),
  clienteId: z.string().min(1).nullable().optional(),
});

export type VentaInput = z.input<typeof ventaSchema>;
