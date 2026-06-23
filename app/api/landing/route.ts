import { db } from "@/app/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  nombre: z.string().min(1).max(100),
  whatsapp: z.string().min(8).max(20),
  correo: z.string().email().optional().or(z.literal("")),
  utm_source: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.parse(body)

    // Anti-spam por IP: máx 5 leads/hora
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const unaHoraAtras = new Date(Date.now() - 3600000)
    const recientes = await db.registroAuditoria.count({
      where: { ip, accion: "LEAD_LANDING", creadoEn: { gte: unaHoraAtras } },
    })
    if (recientes >= 5) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 })
    }

    // Buscar el primer admin para asignar el lead
    const admin = await db.usuario.findFirst({ where: { rol: "ADMIN", activo: true } })
    if (!admin) return NextResponse.json({ error: "No hay vendedor disponible." }, { status: 500 })

    // Verificar duplicado por WhatsApp
    const limpio = parsed.whatsapp.replace(/\D/g, "")
    const duplicado = await db.cliente.findFirst({
      where: { whatsapp: { contains: limpio.slice(-8) }, eliminadoEn: null },
    })

    let clienteId: string

    if (duplicado) {
      // Actualizar lead existente sin crear duplicado
      clienteId = duplicado.id
    } else {
      const origen = parsed.utm_source || "Landing"
      const cliente = await db.cliente.create({
        data: {
          nombre: parsed.nombre,
          whatsapp: limpio,
          correo: parsed.correo || null,
          origen,
          utmSource: parsed.utm_source || null,
          etapa: "NUEVO",
          estadoCartera: "ACTIVO",
          temperatura: "TIBIO",
          proximaAccion: "Contactar en menos de 24 horas",
          fechaProximaAccion: new Date(Date.now() + 86400000),
          vendedorId: admin.id,
        },
      })
      clienteId = cliente.id

      await db.nota.create({
        data: {
          clienteId,
          usuarioId: admin.id,
          contenido: `Lead llegó por la landing pública${parsed.utm_source ? ` (canal: ${parsed.utm_source})` : ""}.`,
          tipo: "SISTEMA",
        },
      })
    }

    await db.registroAuditoria.create({
      data: {
        accion: "LEAD_LANDING",
        entidad: "Cliente",
        entidadId: clienteId,
        descripcion: `Lead "${parsed.nombre}" llegó por la landing`,
        ip,
      },
    })

    return NextResponse.json({ ok: true, clienteId })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos. Verifica nombre y WhatsApp." }, { status: 400 })
    }
    console.error("Error landing:", err)
    return NextResponse.json({ error: "Error al procesar tu solicitud." }, { status: 500 })
  }
}
