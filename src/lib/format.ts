// Cambia MONEDA y el locale si necesitas otra moneda (ej: "USD" / "es-NI")
export const MONEDA = "NIO";

const formatter = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: MONEDA,
});

export const formatMoney = (n: number) => formatter.format(n);

export const ZONA_HORARIA = "America/Managua";

const fechaFormatter = new Intl.DateTimeFormat("es-NI", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: ZONA_HORARIA,
});

export const formatFecha = (d: Date) => fechaFormatter.format(d);

/** Inicio del día actual en la zona del negocio (Nicaragua: UTC-6, sin horario de verano). */
export function inicioDelDia(): Date {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
  return new Date(`${hoy}T00:00:00-06:00`);
}
