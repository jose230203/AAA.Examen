import { z } from "zod";

export const MAX_DIAS_REPORTE = 92;

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00-06:00`).getTime()), "Fecha inválida");

const dias = (desde: string, hasta: string) =>
  (new Date(`${hasta}T00:00:00-06:00`).getTime() - new Date(`${desde}T00:00:00-06:00`).getTime()) /
  86_400_000;

export const filtroReporteSchema = z
  .object({ desde: fecha, hasta: fecha, sucursal: z.string().optional() })
  .refine((d) => d.desde <= d.hasta, {
    message: "La fecha inicial no puede ser mayor a la final",
    path: ["desde"],
  })
  .refine((d) => dias(d.desde, d.hasta) < MAX_DIAS_REPORTE, {
    message: `El rango máximo es de ${MAX_DIAS_REPORTE} días`,
    path: ["hasta"],
  });
