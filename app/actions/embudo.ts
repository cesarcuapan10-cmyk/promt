"use server"

import { db } from "@/app/lib/db"
import { auth } from "@/app/lib/auth"
import { revalidatePath } from "next/cache"

export type ClienteEtapa = {
  id: string
  nombre: string
  empresaNombre: string | null
  temperatura: string
  valorEstimado: number | null
  actualizadoEn: Date
  etapa: string
}

export type EtapaKey = "NUEVO" | "CONTACTADO" | "CITA_AGENDADA" | "PROPUESTA_ENVIADA" | "GANADO"

export type ClientesPorEtapa = Record<EtapaKey, ClienteEtapa[]>

export async function obtenerClientesPorEtapa(): Promise<ClientesPorEtapa> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")

  const clientes = await db.cliente.findMany({
    where: {
      vendedorId: session.user.id,
      estadoCartera: "ACTIVO",
      eliminadoEn: null,
    },
    select: {
      id: true,
      nombre: true,
      empresaNombre: true,
      temperatura: true,
      valorEstimado: true,
      actualizadoEn: true,
      etapa: true,
    },
    orderBy: { actualizadoEn: "desc" },
  })

  const resultado: ClientesPorEtapa = {
    NUEVO: [],
    CONTACTADO: [],
    CITA_AGENDADA: [],
    PROPUESTA_ENVIADA: [],
    GANADO: [],
  }

  for (const cliente of clientes) {
    const etapa = cliente.etapa as EtapaKey
    if (etapa in resultado) {
      resultado[etapa].push(cliente)
    }
  }

  return resultado
}

export async function moverClienteEtapa(clienteId: string, nuevaEtapa: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")

  await db.cliente.update({
    where: { id: clienteId, vendedorId: session.user.id },
    data: { etapa: nuevaEtapa },
  })

  revalidatePath("/embudo")
}
