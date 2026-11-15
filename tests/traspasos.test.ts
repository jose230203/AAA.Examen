import { beforeEach, describe, expect, it } from "vitest";
import { crearEscenario, crearPrenda, prisma, resetDb } from "./helpers";
import {
  cancelarTraspaso,
  crearTraspaso,
  enviarTraspaso,
  recibirTraspaso,
} from "@/lib/traspasos-service";
import { PermisoDenegadoError, PrendaNoDisponibleError, ValidacionError } from "@/lib/errors";

describe("traspasos (BD)", () => {
  let e: Awaited<ReturnType<typeof crearEscenario>>;

  beforeEach(async () => {
    await resetDb();
    e = await crearEscenario();
  });

  const crear = (prendaIds: string[]) =>
    crearTraspaso({ origenId: e.centro.id, destinoId: e.norte.id, prendaIds, actor: e.encargadoCentro });

  it("flujo completo: crear, enviar y recibir mueve las prendas al destino", async () => {
    const p1 = await crearPrenda(e.centro.id, e.categoria.id, "TR-001");
    const p2 = await crearPrenda(e.centro.id, e.categoria.id, "TR-002");

    const t = await crear([p1.id, p2.id]);
    let prendas = await prisma.prenda.findMany({ where: { id: { in: [p1.id, p2.id] } } });
    expect(prendas.every((p) => p.estado === "EN_TRASPASO")).toBe(true);

    await enviarTraspaso(t.id, e.encargadoCentro);
    await recibirTraspaso(t.id, e.encargadoNorte);

    prendas = await prisma.prenda.findMany({ where: { id: { in: [p1.id, p2.id] } } });
    expect(prendas.every((p) => p.sucursalId === e.norte.id && p.estado === "DISPONIBLE")).toBe(true);
    expect((await prisma.traspaso.findUniqueOrThrow({ where: { id: t.id } })).estado).toBe("RECIBIDO");
  });

  it("solo el destino puede recibir", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "TR-003");
    const t = await crear([p.id]);
    await enviarTraspaso(t.id, e.encargadoCentro);

    await expect(recibirTraspaso(t.id, e.encargadoCentro)).rejects.toBeInstanceOf(PermisoDenegadoError);
  });

  it("no se puede recibir un traspaso que no fue enviado", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "TR-004");
    const t = await crear([p.id]);

    await expect(recibirTraspaso(t.id, e.encargadoNorte)).rejects.toBeInstanceOf(ValidacionError);
  });

  it("cancelar devuelve las prendas a disponibles en el origen", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "TR-005");
    const t = await crear([p.id]);
    await cancelarTraspaso(t.id, e.encargadoCentro);

    const despues = await prisma.prenda.findUniqueOrThrow({ where: { id: p.id } });
    expect(despues.estado).toBe("DISPONIBLE");
    expect(despues.sucursalId).toBe(e.centro.id);
  });

  it("dos traspasos simultáneos con la misma prenda: solo uno se crea", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "TR-006");
    const resultados = await Promise.allSettled([crear([p.id]), crear([p.id])]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const fallo = resultados.find((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fallo?.reason).toBeInstanceOf(PrendaNoDisponibleError);
  });

  it("un encargado no puede crear traspasos desde otra sucursal", async () => {
    const p = await crearPrenda(e.centro.id, e.categoria.id, "TR-007");
    await expect(
      crearTraspaso({ origenId: e.centro.id, destinoId: e.norte.id, prendaIds: [p.id], actor: e.encargadoNorte })
    ).rejects.toBeInstanceOf(PermisoDenegadoError);
  });
});
