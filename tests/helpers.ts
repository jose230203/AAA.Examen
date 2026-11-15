import { existsSync, readFileSync } from "node:fs";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export { prisma };

// SEGURIDAD: nunca borrar datos de la base principal
const url = process.env.DATABASE_URL ?? "";
const principal = existsSync(".env")
  ? readFileSync(".env", "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1]
  : undefined;
if (!url || url === principal) {
  throw new Error(
    "Pruebas con BD detenidas: define en .env.test un DATABASE_URL DISTINTO al de tu .env principal"
  );
}

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "AuditLog","DetalleVenta","DetalleTraspaso","Venta","Traspaso","Prenda","Cliente","Usuario","Categoria","Sucursal" RESTART IDENTITY CASCADE`
  );
}

export async function crearEscenario() {
  const centro = await prisma.sucursal.create({ data: { nombre: "Centro" } });
  const norte = await prisma.sucursal.create({ data: { nombre: "Norte" } });
  const categoria = await prisma.categoria.create({ data: { nombre: "Camisas" } });

  const mk = (nombre: string, rol: Rol, sucursalId: string | null) =>
    prisma.usuario.create({
      data: {
        nombre,
        email: `${nombre.toLowerCase().replace(/\s/g, "")}@test.com`,
        passwordHash: "x",
        rol,
        sucursalId,
      },
    });

  const cajero = await mk("Cajero Centro", "CAJERO", centro.id);
  const encargadoCentro = await mk("Encargado Centro", "ENCARGADO", centro.id);
  const encargadoNorte = await mk("Encargado Norte", "ENCARGADO", norte.id);

  return { centro, norte, categoria, cajero, encargadoCentro, encargadoNorte };
}

export function crearPrenda(sucursalId: string, categoriaId: string, codigo: string, costo = 5, venta = 10) {
  return prisma.prenda.create({
    data: {
      codigo,
      descripcion: `Prenda ${codigo}`,
      talla: "M",
      precioCosto: costo,
      precioVenta: venta,
      sucursalId,
      categoriaId,
    },
  });
}
