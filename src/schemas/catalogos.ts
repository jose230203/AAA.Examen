import { z } from "zod";

const nombre = z.string().trim().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres");

export const sucursalSchema = z.object({
  nombre,
  direccion: z.string().trim().max(150, "Dirección muy larga").optional(),
  telefono: z
    .string()
    .trim()
    .max(20, "Teléfono muy largo")
    .regex(/^[0-9+\-\s()]*$/, "Teléfono inválido")
    .optional(),
});
export const actualizarSucursalSchema = sucursalSchema.extend({ id: z.string().min(1) });
export const estadoSucursalSchema = z.object({ id: z.string().min(1), activa: z.boolean() });

export const categoriaSchema = z.object({ nombre });
export const actualizarCategoriaSchema = z.object({ id: z.string().min(1), nombre });
export const idSchema = z.object({ id: z.string().min(1) });
