"use server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"

const ETAPAS = ["NUEVO", "CONTACTADO", "PROPUESTA", "NEGOCIACION", "GANADO"] as const

export async function obtenerClientesPorEtapa() {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuario = sesion.user as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    eliminadoEn: null,
    estadoCartera: "ACTIVO",
    ...(usuario.rol !== "ADMIN" && { vendedorId: sesion.user.id }),
  }

  const clientes = await db.cliente.findMany({
    where,
    orderBy: { actualizadoEn: "desc" },
    include: {
      etiquetas: { include: { etiqueta: true } },
      vendedor: { select: { nombre: true } },
    },
  })

  const porEtapa: Record<string, typeof clientes> = {}
  for (const etapa of ETAPAS) porEtapa[etapa] = []
  for (const c of clientes) {
    const key = ETAPAS.includes(c.etapa as typeof ETAPAS[number]) ? c.etapa : "NUEVO"
    if (!porEtapa[key]) porEtapa[key] = []
    porEtapa[key].push(c)
  }

  return porEtapa
}

export async function moverClienteEtapa(clienteId: string, nuevaEtapa: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const cliente = await db.cliente.findFirst({ where: { id: clienteId, eliminadoEn: null } })
  if (!cliente) return { ok: false, error: "Cliente no encontrado" }
  if ((sesion.user as { rol?: string }).rol !== "ADMIN" && cliente.vendedorId !== sesion.user.id)
    return { ok: false, error: "Sin permiso" }

  await db.cliente.update({
    where: { id: clienteId },
    data: { etapa: nuevaEtapa, etapaAnterior: cliente.etapa },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CAMBIAR_ETAPA",
      usuarioId: sesion.user.id,
      entidad: "Cliente",
      entidadId: clienteId,
      descripcion: `Movió ${cliente.nombre} de ${cliente.etapa} a ${nuevaEtapa}`,
    },
  })

  revalidatePath("/embudo")
  return { ok: true }
}
