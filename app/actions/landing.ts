"use server"

import { db } from "@/app/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// ─── Registro público de leads desde la landing de la Masterclass ────────────
// Esta acción NO requiere sesión: la usa la página pública /landing.
// Cada registro cae en el CRM como cliente NUEVO para que César y el equipo
// le den seguimiento con el flujo que ya existe (temperatura, próxima acción).

const leadSchema = z.object({
  nombre: z.string().min(1, "Escribe tu nombre"),
  whatsapp: z.string().min(7, "Escribe un WhatsApp válido"),
  correo: z.string().email("Correo inválido"),
  reto: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
})

export type LeadData = z.infer<typeof leadSchema>

export async function registrarLead(data: LeadData) {
  const parsed = leadSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }
  const d = parsed.data

  // A quién se le asigna el lead: primer ADMIN activo (o primer usuario activo).
  const responsable =
    (await db.usuario.findFirst({ where: { rol: "ADMIN", activo: true } })) ??
    (await db.usuario.findFirst({ where: { activo: true } }))

  if (!responsable) {
    return { ok: false, error: "No hay un usuario configurado para recibir el registro." }
  }

  const ahora = new Date()
  const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)

  try {
    // Evita duplicados por correo: si ya existe, actualiza; si no, crea.
    const existente = await db.cliente.findFirst({
      where: { correo: d.correo, eliminadoEn: null },
    })

    let clienteId: string

    if (existente) {
      await db.cliente.update({
        where: { id: existente.id },
        data: {
          whatsapp: d.whatsapp || existente.whatsapp,
          telefono: existente.telefono ?? d.whatsapp,
          retoPrincipal: d.reto || existente.retoPrincipal,
          utmSource: d.utmSource || existente.utmSource,
          utmMedium: d.utmMedium || existente.utmMedium,
          utmCampaign: d.utmCampaign || existente.utmCampaign,
          ultimoContacto: ahora,
        },
      })
      clienteId = existente.id
    } else {
      const cliente = await db.cliente.create({
        data: {
          nombre: d.nombre,
          correo: d.correo,
          whatsapp: d.whatsapp,
          telefono: d.whatsapp,
          origen: "Landing",
          etapa: "NUEVO",
          estadoCartera: "ACTIVO",
          temperatura: "TIBIO",
          retoPrincipal: d.reto || null,
          proximaAccion: "Contactar en menos de 24 horas (registro Masterclass)",
          fechaProximaAccion: en24h,
          utmSource: d.utmSource || null,
          utmMedium: d.utmMedium || null,
          utmCampaign: d.utmCampaign || "masterclass_vende_sin_ti",
          vendedorId: responsable.id,
        },
      })
      clienteId = cliente.id
    }

    // Deja rastro en el historial del cliente.
    await db.nota.create({
      data: {
        clienteId,
        usuarioId: responsable.id,
        contenido: d.reto
          ? `Se registró a la Masterclass "Vende Sin Ti". Reto declarado: ${d.reto}`
          : `Se registró a la Masterclass "Vende Sin Ti".`,
        tipo: "NOTA",
      },
    })

    revalidatePath("/clientes")
    revalidatePath("/embudo")
    return { ok: true }
  } catch {
    return { ok: false, error: "No pudimos guardar tu registro. Intenta de nuevo." }
  }
}
