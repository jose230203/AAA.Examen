import { requireUser } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { PermisoDenegadoError } from "@/lib/errors";
import { formatFecha } from "@/lib/format";
import { rangoDesdeClaves } from "@/lib/reportes-service";
import { filtroReporteSchema } from "@/schemas/reportes";

// Evita inyección de fórmulas al abrir el CSV en Excel
const txt = (v: string) => {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
};
const num = (n: number) => n.toFixed(2);

export async function GET(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "ENCARGADO"]);
    const sp = new URL(request.url).searchParams;

    const parsed = filtroReporteSchema.safeParse({
      desde: sp.get("desde") ?? undefined,
      hasta: sp.get("hasta") ?? undefined,
      sucursal: sp.get("sucursal") || undefined,
    });
    if (!parsed.success) {
      return new Response(parsed.error.issues[0].message, { status: 400 });
    }
    const { desde, hasta, sucursal } = parsed.data;
    const sucursalId = user.rol === "ADMIN" ? sucursal : (user.sucursalId ?? "__ninguna__");
    const { inicio, fin } = rangoDesdeClaves(desde, hasta);

    const ventas = await prisma.venta.findMany({
      where: { fecha: { gte: inicio, lte: fin }, ...(sucursalId ? { sucursalId } : {}) },
      orderBy: { fecha: "asc" },
      take: 20000,
      include: {
        sucursal: { select: { nombre: true } },
        cajero: { select: { nombre: true } },
        _count: { select: { detalles: true } },
      },
    });

    const filas = [
      ["Numero", "Fecha", "Sucursal", "Cajero", "Metodo de pago", "Estado", "Prendas", "Subtotal", "Descuento", "Total"].join(","),
      ...ventas.map((v) =>
        [
          v.numero,
          txt(formatFecha(v.fecha)),
          txt(v.sucursal.nombre),
          txt(v.cajero.nombre),
          txt(v.metodoPago),
          txt(v.estado),
          v._count.detalles,
          num(v.subtotal.toNumber()),
          num(v.descuento.toNumber()),
          num(v.total.toNumber()),
        ].join(",")
      ),
    ];

    return new Response("\uFEFF" + filas.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ventas_${desde}_a_${hasta}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof PermisoDenegadoError) return new Response(e.message, { status: 403 });
    console.error("[CSV] Error:", e);
    return new Response("No se pudo generar el reporte", { status: 500 });
  }
}
