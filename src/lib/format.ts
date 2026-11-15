// Cambia MONEDA y el locale si necesitas otra moneda (ej: "USD" / "es-NI")
export const MONEDA = "NIO";

const formatter = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: MONEDA,
});

export const formatMoney = (n: number) => formatter.format(n);
