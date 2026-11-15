import { prisma } from "../src/lib/prisma";
import { registrarVenta } from "../src/lib/ventas-service";

async function main() {
  const sucursal = await prisma.sucursal.findFirstOrThrow({ where: { nombre: "Sucursal Centro" } });
  const cajero = await prisma.usuario.findFirstOrThrow({ where: { email: "cajero1@tiendas.com" } });
  const categoria = await prisma.categoria.findFirstOrThrow();

  const prenda = await prisma.prenda.create({
    data: {
      codigo: `TEST-${Date.now()}`,
      descripcion: "Prenda de prueba de concurrencia",
      talla: "M",
      precioCosto: 5,
      precioVenta: 10,
      sucursalId: sucursal.id,
      categoriaId: categoria.id,
    },
  });

  const intento = () =>
    registrarVenta({
      prendaIds: [prenda.id],
      descuento: 0,
      metodoPago: "EFECTIVO",
      sucursalId: sucursal.id,
      cajeroId: cajero.id,
      rol: "CAJERO",
    });

  const resultados = await Promise.allSettled([intento(), intento()]);
  resultados.forEach((r, i) =>
    console.log(
      `Intento ${i + 1}:`,
      r.status === "fulfilled" ? "VENDIDA" : `RECHAZADA (${(r.reason as Error).message})`
    )
  );

  const exitosas = resultados.filter((r) => r.status === "fulfilled").length;
  console.log(exitosas === 1 ? "\n✅ Correcto: solo una venta se completó" : "\n❌ ERROR: revisar lógica");

  // Limpieza
  const detalles = await prisma.detalleVenta.findMany({ where: { prendaId: prenda.id } });
  await prisma.venta.deleteMany({ where: { id: { in: detalles.map((d) => d.ventaId) } } });
  await prisma.prenda.delete({ where: { id: prenda.id } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
