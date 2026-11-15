import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  NoEncontradoError,
  PermisoDenegadoError,
  PrendaNoDisponibleError,
  ValidacionError,
} from "@/lib/errors";

export type Actor = { id: string; rol: Rol; sucursalId: string | null };

const puedeEn = (actor: Actor, sucursalId: string) =>
  actor.rol === "ADMIN" || actor.sucursalId === sucursalId;

export async function crearTraspaso(p: {
  origenId: string;
  destinoId: string;
  prendaIds: string[];
  notas?: string;
  actor: Actor;
}) {
  if (p.origenId === p.destinoId) {
    throw new ValidacionError("El origen y el destino no pueden ser la misma sucursal");
  }
  if (!puedeEn(p.actor, p.origenId)) {
    throw new PermisoDenegadoError("Solo puedes crear traspasos desde tu sucursal");
  }

  return prisma.$transaction(async (tx) => {
    const sucursales = await tx.sucursal.findMany({
      where: { id: { in: [p.origenId, p.destinoId] }, activa: true },
    });
    if (sucursales.length !== 2) {
      throw new NoEncontradoError("Alguna sucursal no existe o está inactiva");
    }

    // Reserva atómica de las prendas en el origen
    const reservadas = await tx.prenda.updateMany({
      where: { id: { in: p.prendaIds }, sucursalId: p.origenId, estado: "DISPONIBLE" },
      data: { estado: "EN_TRASPASO" },
    });
    if (reservadas.count !== p.prendaIds.length) {
      throw new PrendaNoDisponibleError(
        "Alguna prenda ya no está disponible en la sucursal de origen"
      );
    }

    const traspaso = await tx.traspaso.create({
      data: {
        origenId: p.origenId,
        destinoId: p.destinoId,
        creadoPorId: p.actor.id,
        notas: p.notas || null,
        detalles: { create: p.prendaIds.map((prendaId) => ({ prendaId })) },
      },
    });

    await tx.auditLog.create({
      data: {
        accion: "TRASPASO_CREADO",
        entidad: "Traspaso",
        entidadId: traspaso.id,
        usuarioId: p.actor.id,
        detalle: { origenId: p.origenId, destinoId: p.destinoId, prendaIds: p.prendaIds },
      },
    });

    return { id: traspaso.id, numero: traspaso.numero };
  });
}

export async function enviarTraspaso(traspasoId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.traspaso.findUnique({ where: { id: traspasoId } });
    if (!t) throw new NoEncontradoError("El traspaso no existe");
    if (!puedeEn(actor, t.origenId)) {
      throw new PermisoDenegadoError("Solo la sucursal de origen puede enviar el traspaso");
    }

    const r = await tx.traspaso.updateMany({
      where: { id: traspasoId, estado: "PENDIENTE" },
      data: { estado: "EN_TRANSITO" },
    });
    if (r.count !== 1) throw new ValidacionError("El traspaso ya no está pendiente");

    await tx.auditLog.create({
      data: {
        accion: "TRASPASO_ENVIADO",
        entidad: "Traspaso",
        entidadId: traspasoId,
        usuarioId: actor.id,
      },
    });
  });
}

export async function recibirTraspaso(traspasoId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.traspaso.findUnique({
      where: { id: traspasoId },
      include: { detalles: true },
    });
    if (!t) throw new NoEncontradoError("El traspaso no existe");
    if (!puedeEn(actor, t.destinoId)) {
      throw new PermisoDenegadoError("Solo la sucursal destino puede recibir el traspaso");
    }

    const r = await tx.traspaso.updateMany({
      where: { id: traspasoId, estado: "EN_TRANSITO" },
      data: { estado: "RECIBIDO", fechaRecibido: new Date() },
    });
    if (r.count !== 1) throw new ValidacionError("El traspaso no está en tránsito");

    // Las prendas pasan al inventario de la sucursal destino
    const prendaIds = t.detalles.map((d) => d.prendaId);
    const movidas = await tx.prenda.updateMany({
      where: { id: { in: prendaIds }, estado: "EN_TRASPASO" },
      data: { sucursalId: t.destinoId, estado: "DISPONIBLE" },
    });
    if (movidas.count !== prendaIds.length) {
      throw new ValidacionError("Inconsistencia: alguna prenda no figuraba en traspaso");
    }

    await tx.auditLog.create({
      data: {
        accion: "TRASPASO_RECIBIDO",
        entidad: "Traspaso",
        entidadId: traspasoId,
        usuarioId: actor.id,
        detalle: { prendaIds },
      },
    });
  });
}

export async function cancelarTraspaso(traspasoId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.traspaso.findUnique({
      where: { id: traspasoId },
      include: { detalles: true },
    });
    if (!t) throw new NoEncontradoError("El traspaso no existe");
    if (!puedeEn(actor, t.origenId)) {
      throw new PermisoDenegadoError("Solo la sucursal de origen puede cancelar el traspaso");
    }

    const r = await tx.traspaso.updateMany({
      where: { id: traspasoId, estado: { in: ["PENDIENTE", "EN_TRANSITO"] } },
      data: { estado: "CANCELADO" },
    });
    if (r.count !== 1) {
      throw new ValidacionError("Solo se pueden cancelar traspasos pendientes o en tránsito");
    }

    // Las prendas vuelven a estar disponibles en el origen
    const prendaIds = t.detalles.map((d) => d.prendaId);
    await tx.prenda.updateMany({
      where: { id: { in: prendaIds }, estado: "EN_TRASPASO" },
      data: { estado: "DISPONIBLE" },
    });

    await tx.auditLog.create({
      data: {
        accion: "TRASPASO_CANCELADO",
        entidad: "Traspaso",
        entidadId: traspasoId,
        usuarioId: actor.id,
      },
    });
  });
}
