import { z } from "zod";

export const CONDICIONES = ["EXCELENTE", "BUENA", "REGULAR"] as const;

const tallaRegex = /^(XXS|XS|S|M|L|XL|XXL|XXXL|UNICA|\d{1,2}(\.5)?)$/i;
const numero = (campo: string) =>
  z.number({ message: `${campo}: ingresa un número válido` });

export const prendaSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(3, "El código debe tener al menos 3 caracteres")
      .max(30, "El código es demasiado largo")
      .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones"),
    descripcion: z
      .string()
      .trim()
      .min(3, "La descripción es muy corta")
      .max(120, "Máximo 120 caracteres"),
    talla: z
      .string()
      .trim()
      .regex(tallaRegex, "Talla inválida (ej: S, M, L, XL, 38, 40.5)")
      .transform((t) => t.toUpperCase()),
    marca: z.string().trim().max(50, "Máximo 50 caracteres").optional(),
    color: z.string().trim().max(30, "Máximo 30 caracteres").optional(),
    condicion: z.enum(CONDICIONES, { message: "Selecciona la condición" }),
    precioCosto: numero("Costo")
      .min(0, "El costo no puede ser negativo")
      .max(100000, "Costo demasiado alto"),
    precioVenta: numero("Precio de venta")
      .positive("El precio de venta debe ser mayor a 0")
      .max(100000, "Precio demasiado alto"),
    categoriaId: z.string().min(1, "Selecciona una categoría"),
    sucursalId: z.string().optional(),
  })
  .refine((d) => d.precioVenta >= d.precioCosto, {
    message: "El precio de venta no puede ser menor al costo",
    path: ["precioVenta"],
  });

export type PrendaInput = z.input<typeof prendaSchema>;
export type PrendaData = z.output<typeof prendaSchema>;

export const editarPrendaSchema = z
  .object({
    id: z.string().min(1),
    descripcion: z.string().trim().min(3, "La descripción es muy corta").max(120, "Máximo 120 caracteres"),
    talla: z
      .string()
      .trim()
      .regex(tallaRegex, "Talla inválida (ej: S, M, L, XL, 38, 40.5)")
      .transform((t) => t.toUpperCase()),
    marca: z.string().trim().max(50, "Máximo 50 caracteres").optional(),
    color: z.string().trim().max(30, "Máximo 30 caracteres").optional(),
    condicion: z.enum(CONDICIONES, { message: "Selecciona la condición" }),
    precioCosto: numero("Costo").min(0, "El costo no puede ser negativo").max(100000, "Costo demasiado alto"),
    precioVenta: numero("Precio de venta")
      .positive("El precio de venta debe ser mayor a 0")
      .max(100000, "Precio demasiado alto"),
    categoriaId: z.string().min(1, "Selecciona una categoría"),
  })
  .refine((d) => d.precioVenta >= d.precioCosto, {
    message: "El precio de venta no puede ser menor al costo",
    path: ["precioVenta"],
  });

export type EditarPrendaInput = z.input<typeof editarPrendaSchema>;
export type EditarPrendaData = z.output<typeof editarPrendaSchema>;
