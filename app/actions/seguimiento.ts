"use server"

import { db } from "@/app/lib/db"
import { auth } from "@/app/lib/auth"
import { revalidatePath } from "next/cache"

export async function listarRecordatorios(filtros?: {
  estado?: "todos" | "pendientes" | "completados" | "vencidos"
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")

  const ahora = new Date()
  const estado = filtros?.estado ?? "todos"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    usuarioId: session.user.id,
  }

  if (estado === "pendientes") {
    where.completado = false
    where.fecha = { gte: new Date(ahora.toDateString()) }
  } else if (estado === "completados") {
    where.completado = true
  } else if (estado === "vencidos") {
    where.completado = false
    where.fecha = { lt: new Date(ahora.toDateString()) }
  }

  const recordatorios = await db.recordatorio.findMany({
    where,
    include: {
      cliente: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: [{ fecha: "asc" }, { hora: "asc" }],
  })

  return recordatorios
}

export async function crearRecordatorio(data: {
  titulo: string
  descripcion?: string
  fechaHora: Date
  tipo: string
  clienteId?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")

  const fecha = new Date(data.fechaHora)
  const horas = fecha.getHours().toString().padStart(2, "0")
  const minutos = fecha.getMinutes().toString().padStart(2, "0")
  const hora = `${horas}:${minutos}`

  const recordatorio = await db.recordatorio.create({
    data: {
      titulo: data.titulo,
      fecha: new Date(fecha.toDateString()),
      hora,
      clienteId: data.clienteId || null,
      usuarioId: session.user.id,
    },
  })

  revalidatePath("/seguimiento")
  return recordatorio
}

export async function completarRecordatorio(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")

  await db.recordatorio.update({
    where: { id, usuarioId: session.user.id },
    data: { completado: true },
  })

  revalidatePath("/seguimiento")
}

export async function eliminarRecordatorio(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")

  await db.recordatorio.delete({
    where: { id, usuarioId: session.user.id },
  })

  revalidatePath("/seguimiento")
}
