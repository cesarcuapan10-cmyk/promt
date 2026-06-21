"use server"

import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

type SessionUser = { id: string; rol?: string }
async function getSession(): Promise<{ user: SessionUser }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autorizado")
  return session as { user: SessionUser }
}

const esquemaCita = z.object({
  clienteId: z.string().min(1),
  titulo: z.string().min(1, "El título es obligatorio"),
  fechaInicio: z.string().min(1),
  fechaFin: z.string().min(1),
  notas: z.string().optional().nullable(),
})

export type EsquemaCita = z.infer<typeof esquemaCita>

export async function listarCitas(filtros?: {
  vendedorId?: string
  fecha?: string
  clienteId?: string
  mes?: string
}) {
  const { user } = await getSession()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    eliminadoEn: null,
    ...(user.rol !== "ADMIN" && { vendedorId: user.id }),
    ...(filtros?.clienteId && { clienteId: filtros.clienteId }),
    ...(filtros?.vendedorId && user.rol === "ADMIN" && { vendedorId: filtros.vendedorId }),
  }

  if (filtros?.fecha) {
    const d = new Date(filtros.fecha)
    const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
    const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    where.fechaInicio = { gte: inicio, lte: fin }
  } else if (filtros?.mes) {
    const [año, mes] = filtros.mes.split("-").map(Number)
    where.fechaInicio = {
      gte: new Date(año, mes - 1, 1),
      lte: new Date(año, mes, 0, 23, 59, 59),
    }
  }

  return db.cita.findMany({
    where,
    orderBy: { fechaInicio: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true, telefono: true, whatsapp: true } },
      vendedor: { select: { id: true, nombre: true } },
    },
  })
}

export async function crearCita(data: EsquemaCita) {
  const { user } = await getSession()
  const parsed = esquemaCita.parse(data)

  const cita = await db.cita.create({
    data: {
      clienteId: parsed.clienteId,
      vendedorId: user.id,
      titulo: parsed.titulo,
      fechaInicio: new Date(parsed.fechaInicio),
      fechaFin: new Date(parsed.fechaFin),
      notas: parsed.notas ?? null,
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CREAR_CITA",
      usuarioId: user.id,
      entidad: "Cita",
      entidadId: cita.id,
      descripcion: `Agendó cita "${parsed.titulo}" para ${new Date(parsed.fechaInicio).toLocaleString("es-MX")}`,
    },
  })

  revalidatePath("/agenda")
  return { ok: true, cita }
}

export async function actualizarCita(
  id: string,
  data: Partial<EsquemaCita> & { confirmada?: boolean }
) {
  const { user } = await getSession()
  const cita = await db.cita.findFirst({ where: { id, eliminadoEn: null } })
  if (!cita) return { ok: false, error: "Cita no encontrada" }
  if (user.rol !== "ADMIN" && cita.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.cita.update({
    where: { id },
    data: {
      ...data,
      fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
    },
  })

  revalidatePath("/agenda")
  return { ok: true }
}

export async function eliminarCita(id: string) {
  const { user } = await getSession()
  const cita = await db.cita.findFirst({ where: { id, eliminadoEn: null } })
  if (!cita) return { ok: false, error: "Cita no encontrada" }
  if (user.rol !== "ADMIN" && cita.vendedorId !== user.id)
    return { ok: false, error: "Sin permiso" }

  await db.cita.update({ where: { id }, data: { eliminadoEn: new Date() } })
  revalidatePath("/agenda")
  return { ok: true }
}

export async function listarHorariosDisponibles(vendedorId: string, fecha: string) {
  const d = new Date(fecha)
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0)
  const fin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0)

  const citasExistentes = await db.cita.findMany({
    where: {
      vendedorId,
      eliminadoEn: null,
      fechaInicio: { gte: inicio, lte: fin },
    },
    select: { fechaInicio: true, fechaFin: true },
  })

  const slots: string[] = []
  const duracion = 45 * 60 * 1000

  let cursor = inicio.getTime()
  while (cursor + duracion <= fin.getTime()) {
    const slotInicio = new Date(cursor)
    const slotFin = new Date(cursor + duracion)

    const ocupado = citasExistentes.some((c) => {
      const ci = new Date(c.fechaInicio).getTime()
      const cf = new Date(c.fechaFin).getTime()
      return slotInicio.getTime() < cf && slotFin.getTime() > ci
    })

    if (!ocupado) {
      slots.push(slotInicio.toISOString())
    }
    cursor += duracion
  }

  return slots
}
