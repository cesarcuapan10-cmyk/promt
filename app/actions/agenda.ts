"use server"
import { auth } from "@/app/lib/auth"
import { db } from "@/app/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const esquemaCita = z.object({
  clienteId: z.string().min(1, "Selecciona un cliente"),
  titulo: z.string().min(1, "El título es requerido"),
  fechaInicio: z.string().min(1, "La fecha y hora son requeridas"),
  notas: z.string().optional().nullable(),
})

export type EsquemaCita = z.infer<typeof esquemaCita>

export async function listarCitas(mes?: number, año?: number) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const ahora = new Date()
  const mesActual = mes ?? ahora.getMonth() + 1
  const añoActual = año ?? ahora.getFullYear()

  const inicio = new Date(añoActual, mesActual - 1, 1)
  const fin = new Date(añoActual, mesActual, 1)

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"

  const citas = await db.cita.findMany({
    where: {
      eliminadoEn: null,
      fechaInicio: { gte: inicio, lt: fin },
      ...(!esAdmin && { vendedorId: sesion.user.id }),
    },
    include: {
      cliente: { select: { id: true, nombre: true } },
      vendedor: { select: { id: true, nombre: true } },
    },
    orderBy: { fechaInicio: "asc" },
  })

  return { citas, mes: mesActual, año: añoActual }
}

export async function crearCita(data: EsquemaCita) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const parsed = esquemaCita.parse(data)
  const fechaInicio = new Date(parsed.fechaInicio)

  // Validar horario 09:00-18:00
  const hora = fechaInicio.getHours()
  if (hora < 9 || hora >= 18) {
    return { ok: false, error: "Las citas solo pueden ser de 09:00 a 18:00" }
  }

  // Duración de 45 minutos
  const fechaFin = new Date(fechaInicio.getTime() + 45 * 60 * 1000)

  // Verificar conflictos
  const conflicto = await db.cita.findFirst({
    where: {
      eliminadoEn: null,
      vendedorId: sesion.user.id,
      OR: [
        {
          fechaInicio: { lt: fechaFin },
          fechaFin: { gt: fechaInicio },
        },
      ],
    },
  })

  if (conflicto) {
    return { ok: false, error: "Ya tienes una cita en ese horario" }
  }

  const cita = await db.cita.create({
    data: {
      clienteId: parsed.clienteId,
      vendedorId: sesion.user.id,
      titulo: parsed.titulo,
      fechaInicio,
      fechaFin,
      notas: parsed.notas ?? null,
    },
  })

  // Crear nota en historial del cliente
  await db.nota.create({
    data: {
      clienteId: parsed.clienteId,
      usuarioId: sesion.user.id,
      contenido: `Cita agendada: "${parsed.titulo}" el ${fechaInicio.toLocaleDateString("es-MX", { dateStyle: "long" })} a las ${fechaInicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
      tipo: "CITA",
      fecha: new Date(),
    },
  })

  await db.registroAuditoria.create({
    data: {
      accion: "CREAR_CITA",
      usuarioId: sesion.user.id,
      entidad: "Cita",
      entidadId: cita.id,
      descripcion: `Cita creada: "${parsed.titulo}"`,
    },
  })

  revalidatePath("/agenda")
  return { ok: true, cita }
}

export async function eliminarCita(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const cita = await db.cita.findFirst({ where: { id, eliminadoEn: null } })
  if (!cita) return { ok: false, error: "Cita no encontrada" }

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  if (!esAdmin && cita.vendedorId !== sesion.user.id) {
    return { ok: false, error: "Sin permiso" }
  }

  await db.cita.update({ where: { id }, data: { eliminadoEn: new Date() } })

  await db.registroAuditoria.create({
    data: {
      accion: "ELIMINAR_CITA",
      usuarioId: sesion.user.id,
      entidad: "Cita",
      entidadId: id,
      descripcion: `Cita eliminada: "${cita.titulo}"`,
    },
  })

  revalidatePath("/agenda")
  return { ok: true }
}

export async function confirmarCita(id: string) {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error("No autorizado")

  const cita = await db.cita.findFirst({ where: { id, eliminadoEn: null } })
  if (!cita) return { ok: false, error: "Cita no encontrada" }

  const esAdmin = ((sesion.user as { rol?: string }).rol) === "ADMIN"
  if (!esAdmin && cita.vendedorId !== sesion.user.id) {
    return { ok: false, error: "Sin permiso" }
  }

  await db.cita.update({ where: { id }, data: { confirmada: !cita.confirmada } })
  revalidatePath("/agenda")
  return { ok: true }
}
