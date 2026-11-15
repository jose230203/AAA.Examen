import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PREFIJOS: Record<string, string> = {
  "Sucursal Centro": "CEN",
  "Sucursal Norte": "NOR",
  "Sucursal Sur": "SUR",
  "Sucursal Oriente": "ORI",
};
const MARCAS = ["Levi's", "Zara", "H&M", "Nike", "Adidas", "Gap"];
const COLORES = ["Azul", "Negro", "Blanco", "Rojo", "Verde", "Gris"];
const TALLAS = ["S", "M", "L", "XL", "38", "40"];
const CONDICIONES = ["EXCELENTE", "BUENA", "REGULAR"];

async function main() {
  const sucursales = await prisma.sucursal.findMany();
  const categorias = await prisma.categoria.findMany();
  if (!sucursales.length || !categorias.length) {
    throw new Error("Ejecuta primero: npx prisma db seed");
  }

  for (const s of sucursales) {
    const pref = PREFIJOS[s.nombre] ?? s.nombre.slice(0, 3).toUpperCase();
    for (let i = 1; i <= 15; i++) {
      const cat = categorias[i % categorias.length];
      const costo = 2 + (i % 5) * 1.5;
      const codigo = `${pref}-${String(i).padStart(4, "0")}`;
      await prisma.prenda.upsert({
        where: { codigo },
        update: {},
        create: {
          codigo,
          descripcion: `${cat.nombre.replace(/s$/, "")} de prueba ${i}`,
          talla: TALLAS[i % TALLAS.length],
          marca: MARCAS[i % MARCAS.length],
          color: COLORES[i % COLORES.length],
          condicion: CONDICIONES[i % CONDICIONES.length],
          precioCosto: costo,
          precioVenta: Math.round(costo * 2 * 100) / 100,
          sucursalId: s.id,
          categoriaId: cat.id,
        },
      });
    }
  }

  const norte = sucursales.find((s) => s.nombre === "Sucursal Norte");
  if (norte) {
    const passwordHash = await bcrypt.hash("Admin123*", 10);
    await prisma.usuario.upsert({
      where: { email: "encargado2@tiendas.com" },
      update: {},
      create: {
        nombre: "Encargado Norte",
        email: "encargado2@tiendas.com",
        passwordHash,
        rol: Rol.ENCARGADO,
        sucursalId: norte.id,
      },
    });
    await prisma.usuario.upsert({
      where: { email: "cajero2@tiendas.com" },
      update: {},
      create: {
        nombre: "Cajero Norte",
        email: "cajero2@tiendas.com",
        passwordHash,
        rol: Rol.CAJERO,
        sucursalId: norte.id,
      },
    });
  }

  console.log("Prendas y usuarios de prueba listos");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
