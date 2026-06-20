"use server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"

const ETAPAS_VALIDAS = [
  "NUEVO",
  "CONTACTADO",
  "CITA_AGENDADA",
  "PROPUESTA_ENVIADA",
  "GANADO",
  "PERDIDO",
] as const

type Etapa = (typeof ETAPAS_VALIDAS)[number]

type SessionUser = { id: string; rol?: string }

async function getSesion(): Promise<{ user: SessionUser }> {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")
  return sesion as { user: SessionUser }
}

export async function obtenerClientesPorEtapa() {
  const { user } = await getSesion()

  const where: Record<string, unknown> = {
    eliminadoEn: null,
    estadoCartera: "ACTIVO",
    ...(user.rol !== "ADMIN" && { vendedorId: user.id }),
  }

  const clientes = await db.cliente.findMany({
    where,
    orderBy: { actualizadoEn: "desc" },
    include: {
      etiquetas: { include: { etiqueta: true } },
      vendedor: { select: { nombre: true } },
    },
  })

  const porEtapa: Record<Etapa, typeof clientes> = {
    NUEVO: [],
    CONTACTADO: [],
    CITA_AGENDADA: [],
    PROPUESTA_ENVIADA: [],
    GANADO: [],
    PERDIDO: [],
  }

  for (const c of clientes) {
    const key = ETAPAS_VALIDAS.includes(c.etapa as Etapa) ? (c.etapa as Etapa) : "NUEVO"
    porEtapa[key].push(c)
  }

  return porEtapa
}

export async function moverEtapa(clienteId: string, nuevaEtapa: string) {
  const { user } = await getSesion()

  if (!ETAPAS_VALIDAS.includes(nuevaEtapa as Etapa)) {
    return { ok: false, error: "Etapa inválida" }
  }

  const cliente = await db.cliente.findFirst({ where: { id: clienteId, eliminadoEn: null } })
  if (!cliente) return { ok: false, error: "Cliente no encontrado" }
  if (user.rol !== "ADMIN" && cliente.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.cliente.update({
    where: { id: clienteId },
    data: { etapa: nuevaEtapa, etapaAnterior: cliente.etapa, actualizadoEn: new Date() },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CAMBIAR_ETAPA",
      usuarioId: user.id,
      entidad: "Cliente",
      entidadId: clienteId,
      descripcion: `Movió ${cliente.nombre} de ${cliente.etapa} a ${nuevaEtapa}`,
    },
  })

  revalidatePath("/embudo")
  return { ok: true }
}

export async function marcarGanado(clienteId: string) {
  const { user } = await getSesion()

  const cliente = await db.cliente.findFirst({ where: { id: clienteId, eliminadoEn: null } })
  if (!cliente) return { ok: false, error: "Cliente no encontrado" }
  if (user.rol !== "ADMIN" && cliente.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.cliente.update({
    where: { id: clienteId },
    data: {
      estadoCartera: "GANADO",
      etapa: "GANADO",
      etapaAnterior: cliente.etapa,
      estadoAnterior: cliente.estadoCartera,
    },
  })

  await db.nota.create({
    data: {
      clienteId,
      usuarioId: user.id,
      contenido: "Cliente marcado como GANADO 🎉",
      tipo: "CAMBIO_ETAPA",
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "MARCAR_GANADO",
      usuarioId: user.id,
      entidad: "Cliente",
      entidadId: clienteId,
      descripcion: `${cliente.nombre} marcado como GANADO`,
    },
  })

  revalidatePath("/embudo")
  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}

export async function marcarPerdido(clienteId: string, motivo: string) {
  const { user } = await getSesion()

  const cliente = await db.cliente.findFirst({ where: { id: clienteId, eliminadoEn: null } })
  if (!cliente) return { ok: false, error: "Cliente no encontrado" }
  if (user.rol !== "ADMIN" && cliente.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.cliente.update({
    where: { id: clienteId },
    data: {
      estadoCartera: "PERDIDO",
      etapa: "PERDIDO",
      etapaAnterior: cliente.etapa,
      estadoAnterior: cliente.estadoCartera,
      motivoPerdida: motivo,
    },
  })

  await db.nota.create({
    data: {
      clienteId,
      usuarioId: user.id,
      contenido: `Cliente marcado como PERDIDO. Motivo: ${motivo}`,
      tipo: "CAMBIO_ETAPA",
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "MARCAR_PERDIDO",
      usuarioId: user.id,
      entidad: "Cliente",
      entidadId: clienteId,
      descripcion: `${cliente.nombre} marcado como PERDIDO. Motivo: ${motivo}`,
    },
  })

  revalidatePath("/embudo")
  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}

export async function contarEstados() {
  const { user } = await getSesion()

  const baseWhere: Record<string, unknown> = {
    eliminadoEn: null,
    ...(user.rol !== "ADMIN" && { vendedorId: user.id }),
  }

  const [ganados, perdidos, archivados, activosPorEtapa] = await Promise.all([
    db.cliente.count({ where: { ...baseWhere, estadoCartera: "GANADO" } }),
    db.cliente.count({ where: { ...baseWhere, estadoCartera: "PERDIDO" } }),
    db.cliente.count({ where: { ...baseWhere, estadoCartera: "ARCHIVADO" } }),
    db.cliente.groupBy({
      by: ["etapa"],
      where: { ...baseWhere, estadoCartera: "ACTIVO" },
      _count: { id: true },
      _sum: { valorEstimado: true },
    }),
  ])

  return {
    ganados,
    perdidos,
    archivados,
    activosPorEtapa: activosPorEtapa.map((e) => ({
      etapa: e.etapa,
      count: e._count.id,
      valorTotal: e._sum.valorEstimado ?? 0,
    })),
  }
}

// Backward compat alias
export async function moverClienteEtapa(clienteId: string, nuevaEtapa: string) {
  return moverEtapa(clienteId, nuevaEtapa)
}
