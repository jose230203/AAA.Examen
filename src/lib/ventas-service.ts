import { Prisma, type MetodoPago, type Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  NoEncontradoError,
  PermisoDenegadoError,
  PrendaNoDisponibleError,
  ValidacionError,
} from "@/lib/errors";

// Descuento máximo permitido (% del subtotal) según rol
const DESCUENTO_MAX_PCT: Record<Rol, number> = {
  CAJERO: 10,
  ENCARGADO: 30,
  ADMIN: 100,
};

export type RegistrarVentaParams = {
  prendaIds: string[];
  descuento: number;
  metodoPago: MetodoPago;
  sucursalId: string;
  cajeroId: string;
  rol: Rol;
  clienteId?: string | null;
};

export async function registrarVenta(p: RegistrarVentaParams) {
  return prisma.$transaction(async (tx) => {
    // 1. Las prendas deben existir, ser de esta sucursal y estar disponibles
    const prendas = await tx.prenda.findMany({
      where: { id: { in: p.prendaIds }, sucursalId: p.sucursalId, estado: "DISPONIBLE" },
    });
    if (prendas.length !== p.prendaIds.length) throw new PrendaNoDisponibleError();

    // 2. Cliente (opcional) debe existir
    if (p.clienteId) {
      const cliente = await tx.cliente.findUnique({ where: { id: p.clienteId } });
      if (!cliente) throw new NoEncontradoError("El cliente seleccionado no existe");
    }

    // 3. Montos calculados con los precios de la BD (nunca los del cliente)
    const subtotal = prendas.reduce((a, x) => a.plus(x.precioVenta), new Prisma.Decimal(0));
    const costo = prendas.reduce((a, x) => a.plus(x.precioCosto), new Prisma.Decimal(0));
    const descuento = new Prisma.Decimal(p.descuento).toDecimalPlaces(2);

    if (descuento.gt(subtotal)) {
      throw new ValidacionError("El descuento no puede ser mayor al subtotal");
    }
    const pctMax = DESCUENTO_MAX_PCT[p.rol];
    if (descuento.gt(subtotal.mul(pctMax).div(100))) {
      throw new PermisoDenegadoError(`Tu rol permite un descuento máximo del ${pctMax}%`);
    }

    const total = subtotal.minus(descuento);
    if (total.lte(0)) throw new ValidacionError("El total debe ser mayor a 0");
    if (total.lt(costo) && p.rol === "CAJERO") {
      throw new PermisoDenegadoError(
        "Vender por debajo del costo requiere autorización de un encargado"
      );
    }

    // 4. Reserva atómica: solo cambia las que SIGUEN disponibles.
    //    Si otro cajero se adelantó, count será menor y se hace rollback.
    const reservadas = await tx.prenda.updateMany({
      where: { id: { in: p.prendaIds }, sucursalId: p.sucursalId, estado: "DISPONIBLE" },
      data: { estado: "VENDIDA" },
    });
    if (reservadas.count !== p.prendaIds.length) throw new PrendaNoDisponibleError();

    // 5. Crear la venta con su detalle
    const venta = await tx.venta.create({
      data: {
        subtotal,
        descuento,
        total,
        metodoPago: p.metodoPago,
        sucursalId: p.sucursalId,
        cajeroId: p.cajeroId,
        clienteId: p.clienteId ?? null,
        detalles: {
          create: prendas.map((x) => ({ prendaId: x.id, precioUnitario: x.precioVenta })),
        },
      },
    });

    // 6. Auditoría
    await tx.auditLog.create({
      data: {
        accion: "VENTA_CREADA",
        entidad: "Venta",
        entidadId: venta.id,
        usuarioId: p.cajeroId,
        detalle: { prendaIds: p.prendaIds, total: total.toString() },
      },
    });

    return { id: venta.id, numero: venta.numero, total: total.toString() };
  });
}

export type AnularVentaParams = {
  ventaId: string;
  motivo: string;
  userId: string;
  rol: Rol;
  sucursalId: string | null;
};

export async function anularVenta(p: AnularVentaParams) {
  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id: p.ventaId },
      include: { detalles: true },
    });
    if (!venta) throw new NoEncontradoError("La venta no existe");

    if (p.rol !== "ADMIN" && venta.sucursalId !== p.sucursalId) {
      throw new PermisoDenegadoError("Solo puedes anular ventas de tu sucursal");
    }

    // Marca atómica: si dos personas anulan a la vez, solo una lo logra
    const marcada = await tx.venta.updateMany({
      where: { id: venta.id, estado: "COMPLETADA" },
      data: { estado: "ANULADA" },
    });
    if (marcada.count !== 1) throw new ValidacionError("La venta ya estaba anulada");

    // Las prendas vuelven al inventario
    const prendaIds = venta.detalles.map((d) => d.prendaId);
    const devueltas = await tx.prenda.updateMany({
      where: { id: { in: prendaIds }, estado: "VENDIDA" },
      data: { estado: "DISPONIBLE" },
    });
    if (devueltas.count !== prendaIds.length) {
      throw new ValidacionError("Inconsistencia: alguna prenda no figuraba como vendida");
    }

    await tx.auditLog.create({
      data: {
        accion: "VENTA_ANULADA",
        entidad: "Venta",
        entidadId: venta.id,
        usuarioId: p.userId,
        detalle: { motivo: p.motivo, numero: venta.numero, prendaIds },
      },
    });

    return { numero: venta.numero };
  });
}
