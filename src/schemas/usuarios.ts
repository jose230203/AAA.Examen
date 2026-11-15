import { z } from "zod";

export const ROLES = ["ADMIN", "ENCARGADO", "CAJERO"] as const;

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar 72 caracteres")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/\d/, "Debe incluir un número");

const nombre = z.string().trim().min(2, "Nombre muy corto").max(80, "Máximo 80 caracteres");
const email = z.string().trim().toLowerCase().email("Correo inválido");
const rol = z.enum(ROLES, { message: "Rol inválido" });
const sucursalId = z.string().optional();

const necesitaSucursal = (d: { rol: string; sucursalId?: string }) =>
  d.rol === "ADMIN" || !!d.sucursalId;
const msgSucursal = {
  message: "Los encargados y cajeros necesitan una sucursal",
  path: ["sucursalId"],
};

export const crearUsuarioSchema = z
  .object({ nombre, email, rol, sucursalId, password: passwordSchema })
  .refine(necesitaSucursal, msgSucursal);

export const actualizarUsuarioSchema = z
  .object({ id: z.string().min(1), nombre, rol, sucursalId })
  .refine(necesitaSucursal, msgSucursal);

export const estadoUsuarioSchema = z.object({ id: z.string().min(1), activo: z.boolean() });
export const idUsuarioSchema = z.object({ id: z.string().min(1) });
export const resetPasswordSchema = z.object({ id: z.string().min(1), password: passwordSchema });

export const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    nueva: passwordSchema,
    confirmar: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((d) => d.nueva === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })
  .refine((d) => d.actual !== d.nueva, {
    message: "La nueva contraseña debe ser distinta a la actual",
    path: ["nueva"],
  });

export type CrearUsuarioInput = z.input<typeof crearUsuarioSchema>;
export type CambiarPasswordInput = z.input<typeof cambiarPasswordSchema>;
