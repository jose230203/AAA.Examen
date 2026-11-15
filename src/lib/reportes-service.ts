import { prisma } from "@/lib/prisma";
import { ZONA_HORARIA } from "@/lib/format";

const diaFmt = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });
const r2 = (n: number) => Math.round(n * 100) / 100;

export const claveDia = (d: Date) => diaFmt.format(d); // YYYY-MM-DD en hora de Nicaragua
export const hoyClave = () => claveDia(new Date());

export function sumarDias(clave: string, dias: number) {
  const d = new Date(`${clave}T12:00:00-06:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  return claveDia(d);
}

export function rangoDesdeClaves(desde: string, hasta: string) {
  return {
    inicio: new Date(`${desde}T00:00:00-06:00`),
    fin: new Date(`${hasta}T23:59:59.999-06:00`),
  };
}

type Acum = { monto: number; ventas: number };

function sumar(m: Map<string, Acum>, clave: string, monto: number) {
  const x = m.get(clave) ?? { monto: 0, ventas: 0 };
  x.monto += monto;
  x.ventas += 1;
  m.set(clave, x);
}

const lista = (m: Map<string, Acum>) =>
  [...m.entries()]
    .map(([nombre, v]) => ({ nombre, monto: r2(v.monto), ventas: v.ventas }))
    .sort((a, b) => b.monto - a.monto);

export async function obtenerReporte(p: { desde: string; hasta: string; sucursalId?: string }) {
  const { inicio, fin } = rangoDesdeClaves(p.desde, p.hasta);

  const ventas = await prisma.venta.findMany({
    where: {
      estado: "COMPLETADA",
      fecha: { gte: inicio, lte: fin },
      ...(p.sucursalId ? { sucursalId: p.sucursalId } : {}),
    },
    select: {
      fecha: true,
      total: true,
      descuento: true,
      metodoPago: true,
      sucursal: { select: { nombre: true } },
      cajero: { select: { nombre: true } },
      detalles: {
        select: {
          precioUnitario: true,
          prenda: { select: { precioCosto: true, categoria: { select: { nombre: true } } } },
        },
      },
    },
    take: 10000,
  });

  const dias = new Map<string, Acum>();
  for (let c = p.desde, i = 0; c <= p.hasta && i < 400; c = sumarDias(c, 1), i++) {
    dias.set(c, { monto: 0, ventas: 0 });
  }
  const porSucursal = new Map<string, Acum>();
  const porCajero = new Map<string, Acum>();
  const porMetodo = new Map<string, Acum>();
  const porCategoria = new Map<string, { monto: number; prendas: number }>();

  let monto = 0;
  let descuentos = 0;
  let costo = 0;

  for (const v of ventas) {
    const total = v.total.toNumber();
    monto += total;
    descuentos += v.descuento.toNumber();

    sumar(dias, claveDia(v.fecha), total);
    sumar(porSucursal, v.sucursal.nombre, total);
    sumar(porCajero, v.cajero.nombre, total);
    sumar(porMetodo, v.metodoPago, total);

    for (const d of v.detalles) {
      costo += d.prenda.precioCosto.toNumber();
      const cat = d.prenda.categoria.nombre;
      const acc = porCategoria.get(cat) ?? { monto: 0, prendas: 0 };
      acc.monto += d.precioUnitario.toNumber();
      acc.prendas += 1;
      porCategoria.set(cat, acc);
    }
  }

  return {
    resumen: {
      ventas: ventas.length,
      monto: r2(monto),
      descuentos: r2(descuentos),
      costo: r2(costo),
      utilidad: r2(monto - costo),
      ticketPromedio: ventas.length ? r2(monto / ventas.length) : 0,
    },
    porDia: [...dias.entries()].map(([clave, v]) => ({
      clave,
      etiqueta: `${clave.slice(8)}/${clave.slice(5, 7)}`,
      monto: r2(v.monto),
      ventas: v.ventas,
    })),
    porSucursal: lista(porSucursal),
    porCajero: lista(porCajero),
    porMetodo: lista(porMetodo),
    porCategoria: [...porCategoria.entries()]
      .map(([nombre, v]) => ({ nombre, monto: r2(v.monto), prendas: v.prendas }))
      .sort((a, b) => b.monto - a.monto),
  };
}

export async function resumenStock(sucursalId?: string) {
  const [grupos, sucursales] = await Promise.all([
    prisma.prenda.groupBy({
      by: ["sucursalId"],
      where: { estado: "DISPONIBLE", ...(sucursalId ? { sucursalId } : {}) },
      _count: { _all: true },
      _sum: { precioCosto: true, precioVenta: true },
    }),
    prisma.sucursal.findMany({ select: { id: true, nombre: true } }),
  ]);
  const nombres = new Map(sucursales.map((s) => [s.id, s.nombre]));

  return grupos
    .map((g) => ({
      nombre: nombres.get(g.sucursalId) ?? "—",
      prendas: g._count._all,
      costo: g._sum.precioCosto?.toNumber() ?? 0,
      valorVenta: g._sum.precioVenta?.toNumber() ?? 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function prendasAntiguas(sucursalId?: string, limite = 10) {
  const prendas = await prisma.prenda.findMany({
    where: { estado: "DISPONIBLE", ...(sucursalId ? { sucursalId } : {}) },
    orderBy: { createdAt: "asc" },
    take: limite,
    select: {
      codigo: true,
      descripcion: true,
      createdAt: true,
      precioVenta: true,
      sucursal: { select: { nombre: true } },
    },
  });
  const ahora = Date.now();
  return prendas.map((p) => ({
    codigo: p.codigo,
    descripcion: p.descripcion,
    sucursal: p.sucursal.nombre,
    precioVenta: p.precioVenta.toNumber(),
    dias: Math.floor((ahora - p.createdAt.getTime()) / 86_400_000),
  }));
}
