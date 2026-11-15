import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const nombres = ["Sucursal Centro", "Sucursal Norte", "Sucursal Sur", "Sucursal Oriente"];
  const sucursales = [];
  for (const nombre of nombres) {
    sucursales.push(
      await prisma.sucursal.upsert({ where: { nombre }, update: {}, create: { nombre } })
    );
  }

  for (const nombre of ["Camisas", "Pantalones", "Vestidos", "Chaquetas", "Zapatos", "Accesorios"]) {
    await prisma.categoria.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  const passwordHash = await bcrypt.hash("Admin123*", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@tiendas.com" },
    update: {},
    create: { nombre: "Administrador", email: "admin@tiendas.com", passwordHash, rol: Rol.ADMIN },
  });

  await prisma.usuario.upsert({
    where: { email: "encargado1@tiendas.com" },
    update: {},
    create: {
      nombre: "Encargado Centro",
      email: "encargado1@tiendas.com",
      passwordHash,
      rol: Rol.ENCARGADO,
      sucursalId: sucursales[0].id,
    },
  });

  await prisma.usuario.upsert({
    where: { email: "cajero1@tiendas.com" },
    update: {},
    create: {
      nombre: "Cajero Centro",
      email: "cajero1@tiendas.com",
      passwordHash,
      rol: Rol.CAJERO,
      sucursalId: sucursales[0].id,
    },
  });

  console.log("Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
