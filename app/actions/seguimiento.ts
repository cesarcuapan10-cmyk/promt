"use server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const esquemaRecordatorio = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  fecha: z.string().min(1, "La fecha es requerida"),
  hora: z.string().optional().nullable(),
  clienteId: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
})

export type EsquemaRecordatorio = z.infer<typeof esquemaRecordatorio>

export async function listarRecordatorios(filtro?: "PENDIENTES" | "COMPLETADOS" | "TODOS") {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    usuarioId: sesion.user.id,
    ...(filtro === "PENDIENTES" && { completado: false }),
    ...(filtro === "COMPLETADOS" && { completado: true }),
  }

  const recordatorios = await db.recordatorio.findMany({
    where,
    orderBy: { fecha: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true, telefono: true, whatsapp: true } },
    },
  })

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)
  const enSieteDias = new Date(hoy)
  enSieteDias.setDate(enSieteDias.getDate() + 7)

  type Rec = (typeof recordatorios)[number]
  const vencidos = recordatorios.filter(
    (r: Rec) => !r.completado && new Date(r.fecha) < hoy
  )
  const hoyLista = recordatorios.filter((r: Rec) => {
    const f = new Date(r.fecha)
    return !r.completado && f >= hoy && f < manana
  })
  const proximos = recordatorios.filter((r: Rec) => {
    const f = new Date(r.fecha)
    return !r.completado && f >= manana && f <= enSieteDias
  })

  return { todos: recordatorios, vencidos, hoy: hoyLista, proximos }
}

export async function crearRecordatorio(data: EsquemaRecordatorio) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const parsed = esquemaRecordatorio.parse(data)
  const recordatorio = await db.recordatorio.create({
    data: {
      titulo: parsed.titulo,
      fecha: new Date(parsed.fecha),
      hora: parsed.hora || null,
      clienteId: parsed.clienteId || null,
      usuarioId: sesion.user.id,
    },
  })

  revalidatePath("/seguimiento")
  return { ok: true, recordatorio }
}

export async function completarRecordatorio(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const rec = await db.recordatorio.findFirst({ where: { id, usuarioId: sesion.user.id } })
  if (!rec) return { ok: false, error: "No encontrado" }

  await db.recordatorio.update({ where: { id }, data: { completado: !rec.completado } })
  revalidatePath("/seguimiento")
  return { ok: true }
}

export async function eliminarRecordatorio(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const rec = await db.recordatorio.findFirst({ where: { id, usuarioId: sesion.user.id } })
  if (!rec) return { ok: false, error: "No encontrado" }

  await db.recordatorio.delete({ where: { id } })
  revalidatePath("/seguimiento")
  return { ok: true }
}

export async function clientesParaContactarHoy() {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const clientes = await db.cliente.findMany({
    where: {
      eliminadoEn: null,
      estadoCartera: "ACTIVO",
      ...(!esAdmin && { vendedorId: sesion.user.id }),
      OR: [
        { fechaProximaAccion: { lte: hoy } },
        { etapa: "NUEVO", ultimoContacto: { lte: hace24h } },
        { etapa: "NUEVO", ultimoContacto: null },
      ],
    },
    orderBy: [{ valorEstimado: "desc" }],
    select: {
      id: true,
      nombre: true,
      telefono: true,
      whatsapp: true,
      temperatura: true,
      proximaAccion: true,
      fechaProximaAccion: true,
      ultimoContacto: true,
      etapa: true,
    },
  })

  const orden: Record<string, number> = { CALIENTE: 0, TIBIO: 1, FRIO: 2 }
  return clientes.sort((a, b) => (orden[a.temperatura ?? "FRIO"] ?? 2) - (orden[b.temperatura ?? "FRIO"] ?? 2))
}

export async function clientesSinProximaAccion() {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"

  return db.cliente.findMany({
    where: {
      eliminadoEn: null,
      estadoCartera: "ACTIVO",
      fechaProximaAccion: null,
      ...(!esAdmin && { vendedorId: sesion.user.id }),
    },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      whatsapp: true,
      temperatura: true,
      etapa: true,
      ultimoContacto: true,
    },
    orderBy: { creadoEn: "desc" },
  })
}

export async function clientesEstancados(umbral = 7) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  const limite = new Date(Date.now() - umbral * 24 * 60 * 60 * 1000)

  return db.cliente.findMany({
    where: {
      eliminadoEn: null,
      estadoCartera: "ACTIVO",
      actualizadoEn: { lte: limite },
      ...(!esAdmin && { vendedorId: sesion.user.id }),
    },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      temperatura: true,
      etapa: true,
      actualizadoEn: true,
      ultimoContacto: true,
    },
    orderBy: { actualizadoEn: "asc" },
  })
}
