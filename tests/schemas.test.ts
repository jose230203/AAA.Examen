import { describe, expect, it } from "vitest";
import { prendaSchema } from "@/schemas/prenda";
import { ventaSchema } from "@/schemas/venta";
import { traspasoCodigosSchema } from "@/schemas/traspaso";
import { filtroReporteSchema } from "@/schemas/reportes";
import { passwordSchema } from "@/schemas/usuarios";

const prendaOk = {
  codigo: "ABC-1",
  descripcion: "Camisa de lino",
  talla: "m",
  condicion: "BUENA",
  precioCosto: 5,
  precioVenta: 10,
  categoriaId: "cat1",
};

describe("prendaSchema", () => {
  it("acepta datos válidos y normaliza la talla", () => {
    const r = prendaSchema.safeParse(prendaOk);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.talla).toBe("M");
  });
  it("rechaza precio de venta menor al costo", () => {
    expect(prendaSchema.safeParse({ ...prendaOk, precioVenta: 3 }).success).toBe(false);
  });
  it("rechaza códigos con caracteres inválidos", () => {
    expect(prendaSchema.safeParse({ ...prendaOk, codigo: "AB C!" }).success).toBe(false);
  });
  it("rechaza tallas inválidas y precios no numéricos", () => {
    expect(prendaSchema.safeParse({ ...prendaOk, talla: "GIGANTE" }).success).toBe(false);
    expect(prendaSchema.safeParse({ ...prendaOk, precioCosto: NaN }).success).toBe(false);
  });
});

describe("ventaSchema", () => {
  const ok = { prendaIds: ["a", "b"], descuento: 0, metodoPago: "EFECTIVO" };
  it("acepta una venta válida", () => {
    expect(ventaSchema.safeParse(ok).success).toBe(true);
  });
  it("rechaza carrito vacío, prendas repetidas y descuento negativo", () => {
    expect(ventaSchema.safeParse({ ...ok, prendaIds: [] }).success).toBe(false);
    expect(ventaSchema.safeParse({ ...ok, prendaIds: ["a", "a"] }).success).toBe(false);
    expect(ventaSchema.safeParse({ ...ok, descuento: -1 }).success).toBe(false);
  });
  it("rechaza métodos de pago desconocidos", () => {
    expect(ventaSchema.safeParse({ ...ok, metodoPago: "BITCOIN" }).success).toBe(false);
  });
});

describe("traspasoCodigosSchema", () => {
  const ok = { origenId: "a", destinoId: "b", codigos: ["CEN-0001"] };
  it("acepta un traspaso válido", () => {
    expect(traspasoCodigosSchema.safeParse(ok).success).toBe(true);
  });
  it("rechaza origen igual al destino y códigos inválidos", () => {
    expect(traspasoCodigosSchema.safeParse({ ...ok, destinoId: "a" }).success).toBe(false);
    expect(traspasoCodigosSchema.safeParse({ ...ok, codigos: ["AB C"] }).success).toBe(false);
    expect(traspasoCodigosSchema.safeParse({ ...ok, codigos: [] }).success).toBe(false);
  });
});

describe("filtroReporteSchema", () => {
  it("acepta un rango válido", () => {
    expect(filtroReporteSchema.safeParse({ desde: "2026-11-01", hasta: "2026-11-15" }).success).toBe(true);
  });
  it("rechaza desde > hasta, fechas imposibles y rangos enormes", () => {
    expect(filtroReporteSchema.safeParse({ desde: "2026-11-15", hasta: "2026-11-01" }).success).toBe(false);
    expect(filtroReporteSchema.safeParse({ desde: "2026-02-31", hasta: "2026-03-05" }).success).toBe(false);
    expect(filtroReporteSchema.safeParse({ desde: "2026-01-01", hasta: "2026-11-15" }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("exige longitud, mayúscula, minúscula y número", () => {
    expect(passwordSchema.safeParse("Abcdefg1").success).toBe(true);
    expect(passwordSchema.safeParse("abc").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefgh1").success).toBe(false);
    expect(passwordSchema.safeParse("Abcdefgh").success).toBe(false);
  });
});
