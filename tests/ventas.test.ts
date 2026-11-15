import { beforeEach, describe, expect, it } from "vitest";
import { crearEscenario, crearPrenda, prisma, resetDb } from "./helpers";
import { anularVenta, registrarVenta } from "@/lib/ventas-service";
import { PermisoDenegadoError, PrendaNoDisponibleError, ValidacionError } from "@/lib/errors";

describe("ventas (BD)", () => {
  let e: Awaited<ReturnType<typeof crearEscenario>>;

  beforeEach(async () => {
    await resetDb();
    e = await crearEscenario();
  });

  const vender = (prendaIds: string[], extra: { descuento?: number } = {}) =>
    registrarVenta({
      prendaIds,
      descuento: 0,
      metodoPago: "EFECTIVO",
      sucursalId: e.centro.id,
      cajeroId: e.cajero.id,
      rol: "CAJERO",
      ...extra,
    });

  it("vende una prenda disponible y la marca como vendida", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "T-001");
    const venta = await vender([p.id]);

    expect(venta.total).toBe("10");
    const despues = await prisma.prenda.findUniqueOrThrow({ where: { id: p.id } });
    expect(despues.estado).toBe("VENDIDA");
  });

  it("con dos ventas simultáneas de la misma prenda solo una se completa", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "T-002");
    const resultados = await Promise.allSettled([vender([p.id]), vender([p.id])]);

    const ok = resultados.filter((r) => r.status === "fulfilled");
    const fallos = resultados.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(ok).toHaveLength(1);
    expect(fallos).toHaveLength(1);
    expect(fallos[0].reason).toBeInstanceOf(PrendaNoDisponibleError);
    expect(await prisma.venta.count()).toBe(1);
  });

  it("no permite vender prendas de otra sucursal", async () => {
    const p = await crearPrenda(e.norte.id, e.categoria.id, "T-003");
    await expect(vender([p.id])).rejects.toBeInstanceOf(PrendaNoDisponibleError);

    const despues = await prisma.prenda.findUniqueOrThrow({ where: { id: p.id } });
    expect(despues.estado).toBe("DISPONIBLE");
  });

  it("limita el descuento del cajero al 10%", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "T-004");
    await expect(vender([p.id], { descuento: 5 })).rejects.toBeInstanceOf(PermisoDenegadoError);
  });

  it("el cajero no puede vender por debajo del costo", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "T-005", 10, 10);
    await expect(vender([p.id], { descuento: 1 })).rejects.toBeInstanceOf(PermisoDenegadoError);
  });

  it("anular devuelve la prenda al inventario y no se puede anular dos veces", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "T-006");
    const venta = await vender([p.id]);

    const datos = {
      ventaId: venta.id,
      motivo: "Error de cobro",
      userId: e.encargadoCentro.id,
      rol: "ENCARGADO" as const,
      sucursalId: e.centro.id,
    };
    await anularVenta(datos);

    const despues = await prisma.prenda.findUniqueOrThrow({ where: { id: p.id } });
    expect(despues.estado).toBe("DISPONIBLE");
    await expect(anularVenta(datos)).rejects.toBeInstanceOf(ValidacionError);
  });

  it("un encargado de otra sucursal no puede anular la venta", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "T-007");
    const venta = await vender([p.id]);

    await expect(
      anularVenta({
        ventaId: venta.id,
        motivo: "Intento indebido",
        userId: e.encargadoNorte.id,
        rol: "ENCARGADO",
        sucursalId: e.norte.id,
      })
    ).rejects.toBeInstanceOf(PermisoDenegadoError);
  });
});
